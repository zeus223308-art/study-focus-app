import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { theme } from '@/constants/theme';
import { useLocalCalendarDay } from '@/hooks/useLocalCalendarDay';
import { initI18n } from '@/i18n';
import { todayKey } from '@/lib/domain/dates';
import { appendCaptureToData } from '@/lib/domain/bundle-factory';
import type {
  AppData,
  AppSettings,
  Language,
  LayerCycleChoice,
  NoteBundle,
  ReviewSchedule,
  SubjectFolder,
} from '@/lib/domain/types';
import { buildDateRibbonMarks, getDueBundlesForDate } from '@/lib/domain/ribbon';
import { isDueToday, advanceAfterReview, resetReviewCycle, maintainReviewCycle } from '@/lib/spacing/engine';
import {
  createTrashLifecycle,
  filterActiveTrash,
  canRestoreFromBackup,
} from '@/lib/trash/lifecycle';
import { createStorageProvider, checkFreemiumLimits, countPages } from '@/services/storage';
import type { StorageProvider, FreemiumCheck } from '@/services/storage/types';

type AppContextValue = {
  ready: boolean;
  storage: StorageProvider;
  data: AppData;
  dueToday: NoteBundle[];
  ribbonMarks: ReturnType<typeof buildDateRibbonMarks>;
  localToday: string;
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  dueSelected: NoteBundle[];
  freemium: FreemiumCheck;
  paywallVisible: boolean;
  setPaywallVisible: (v: boolean) => void;
  refresh: () => Promise<void>;
  capturePhoto: (imageUri: string, subjectId: string, studyDate?: string) => Promise<string | null>;
  addSubject: (name: string, scheduleId: string) => void;
  setSubjectSchedule: (subjectId: string, scheduleId: string) => void;
  toggleActiveSchedule: (id: string) => void;
  updateBundle: (id: string, patch: Partial<NoteBundle>) => void;
  completeReview: (bundleId: string) => void;
  archiveBundle: (id: string) => void;
  moveBundleToTrash: (id: string) => void;
  restoreTrash: (trashId: string) => void;
  applyLayerCycleChoice: (bundleId: string, choice: LayerCycleChoice) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  getSchedule: (id: string) => ReviewSchedule | undefined;
  syncCloud: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const storage = useMemo(() => createStorageProvider(), []);
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<AppData | null>(null);
  const localToday = useLocalCalendarDay();
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const prevLocalTodayRef = useRef(localToday);

  const load = useCallback(async () => {
    const loaded = await storage.loadAppData();
    const activeTrash = filterActiveTrash(loaded.trash);
    setData({ ...loaded, trash: activeTrash });
    initI18n(loaded.settings.language);
    setReady(true);
  }, [storage]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const prev = prevLocalTodayRef.current;
    if (prev === localToday) return;
    prevLocalTodayRef.current = localToday;
    setSelectedDate((cur) => {
      if (cur > localToday) return localToday;
      if (cur === prev) return localToday;
      return cur;
    });
  }, [localToday]);

  useEffect(() => {
    if (!ready || !data) return;
    storage.saveAppData(data);
  }, [data, ready, storage]);

  const persist = useCallback((next: AppData) => setData(next), []);

  const getSchedule = useCallback(
    (id: string) => data?.schedules.find((s) => s.id === id),
    [data]
  );

  const freemium = useMemo(
    () => (data ? checkFreemiumLimits(data) : { allowed: true, reason: null, usedImages: 0, usedMemos: 0 }),
    [data]
  );

  const dueToday = useMemo(() => {
    if (!data) return [];
    return data.bundles.filter((b) => {
      const s = getSchedule(b.review.reviewScheduleId);
      return s ? isDueToday(b, s) : false;
    });
  }, [data, getSchedule]);

  const ribbonMarks = useMemo(() => {
    if (!data) return [];
    return buildDateRibbonMarks(data.bundles, getSchedule, data.settings.firstLaunchDate);
  }, [data, getSchedule, localToday]);

  const dueSelected = useMemo(() => {
    if (!data) return [];
    return getDueBundlesForDate(data, selectedDate, getSchedule);
  }, [data, selectedDate, getSchedule]);

  const capturePhoto = useCallback(
    async (imageUri: string, subjectId: string, studyDate?: string) => {
      if (!data) return null;
      const check = checkFreemiumLimits(data);
      if (!check.allowed) {
        setPaywallVisible(true);
        return null;
      }
      const { data: next } = await appendCaptureToData(storage, data, {
        imageUri,
        subjectId,
        studyDate,
      });
      persist(next);
      const bundle = next.bundles.find(
        (b) =>
          b.subjectId === subjectId &&
          (studyDate ? b.studyDate === studyDate : b.studyDate === todayKey())
      );
      return bundle?.id ?? next.bundles[0]?.id ?? null;
    },
    [data, storage, persist]
  );

  const addSubject = useCallback((name: string, scheduleId: string) => {
    const subject: SubjectFolder = {
      id: `folder_${Date.now()}`,
      name: name.trim(),
      reviewScheduleId: scheduleId,
      color: theme.gray,
      sortOrder: data?.subjects.length ?? 0,
      createdAt: new Date().toISOString(),
    };
    setData((prev) => (prev ? { ...prev, subjects: [...prev.subjects, subject] } : prev));
  }, [data?.subjects.length]);

  const setSubjectSchedule = useCallback((subjectId: string, scheduleId: string) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            subjects: prev.subjects.map((s) =>
              s.id === subjectId ? { ...s, reviewScheduleId: scheduleId } : s
            ),
          }
        : prev
    );
  }, []);

  const toggleActiveSchedule = useCallback((scheduleId: string) => {
    setData((prev) => {
      if (!prev) return prev;
      const active = [...prev.settings.activeScheduleIds];
      const idx = active.indexOf(scheduleId);
      if (idx >= 0) {
        if (active.length <= 1) return prev;
        active.splice(idx, 1);
      } else if (active.length < 2) {
        active.push(scheduleId);
      } else {
        active.shift();
        active.push(scheduleId);
      }
      return { ...prev, settings: { ...prev.settings, activeScheduleIds: active } };
    });
  }, []);

  const updateBundle = useCallback((id: string, patch: Partial<NoteBundle>) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            bundles: prev.bundles.map((b) =>
              b.id === id ? { ...b, ...patch, updatedAt: new Date().toISOString() } : b
            ),
          }
        : prev
    );
  }, []);

  const completeReview = useCallback(
    (bundleId: string) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          bundles: prev.bundles.map((b) =>
            b.id === bundleId ? advanceAfterReview(b) : b
          ),
        };
      });
    },
    []
  );

  const archiveBundle = useCallback((id: string) => {
    updateBundle(id, { archived: true, archivedAt: new Date().toISOString() });
  }, [updateBundle]);

  const moveBundleToTrash = useCallback((id: string) => {
    setData((prev) => {
      if (!prev) return prev;
      const bundle = prev.bundles.find((b) => b.id === id);
      if (!bundle) return prev;
      return {
        ...prev,
        bundles: prev.bundles.filter((b) => b.id !== id),
        trash: [createTrashLifecycle(bundle), ...prev.trash],
      };
    });
  }, []);

  const restoreTrash = useCallback((trashId: string) => {
    setData((prev) => {
      if (!prev) return prev;
      const entry = prev.trash.find((t) => t.id === trashId);
      if (!entry || !canRestoreFromBackup(entry)) return prev;
      return {
        ...prev,
        bundles: [{ ...entry.bundleSnapshot, archived: false }, ...prev.bundles],
        trash: prev.trash.filter((t) => t.id !== trashId),
      };
    });
  }, []);

  const applyLayerCycleChoice = useCallback((bundleId: string, choice: LayerCycleChoice) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        bundles: prev.bundles.map((b) => {
          if (b.id !== bundleId) return b;
          return choice === 'reset' ? resetReviewCycle(b) : maintainReviewCycle(b);
        }),
      };
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setData((prev) => {
      if (!prev) return prev;
      const settings = { ...prev.settings, ...patch };
      if (patch.language) initI18n(patch.language);
      return { ...prev, settings };
    });
  }, []);

  const syncCloud = useCallback(async () => {
    if (!data) return;
    const next = await storage.syncAllPending(data);
    persist(next);
  }, [data, storage, persist]);

  const value = useMemo<AppContextValue | null>(() => {
    if (!data) return null;
    return {
      ready,
      storage,
      data,
      dueToday,
      localToday,
      ribbonMarks,
      selectedDate,
      setSelectedDate,
      dueSelected,
      freemium,
      paywallVisible,
      setPaywallVisible,
      refresh: load,
      capturePhoto,
      addSubject,
      setSubjectSchedule,
      toggleActiveSchedule,
      updateBundle,
      completeReview,
      archiveBundle,
      moveBundleToTrash,
      restoreTrash,
      applyLayerCycleChoice,
      updateSettings,
      getSchedule,
      syncCloud,
    };
  }, [
    ready,
    storage,
    data,
    dueToday,
    localToday,
    ribbonMarks,
    selectedDate,
    dueSelected,
    freemium,
    paywallVisible,
    load,
    capturePhoto,
    addSubject,
    setSubjectSchedule,
    toggleActiveSchedule,
    updateBundle,
    completeReview,
    archiveBundle,
    moveBundleToTrash,
    restoreTrash,
    applyLayerCycleChoice,
    updateSettings,
    getSchedule,
    syncCloud,
  ]);

  if (!value) return null;
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp within AppProvider');
  return ctx;
}

export function useLanguage() {
  const { data, updateSettings } = useApp();
  return {
    language: data.settings.language,
    setLanguage: (language: Language) => updateSettings({ language }),
  };
}
