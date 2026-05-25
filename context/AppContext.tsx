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
import { ensureAppDataDerivatives } from '@/lib/files/regenerate-derivatives';
import { upgradeLegacyPhotoQuality } from '@/lib/files/upgrade-legacy-assets';
import { appendCaptureToData, appendPageToBundle } from '@/lib/domain/bundle-factory';
import type {
  AppData,
  AppSettings,
  Language,
  LayerCycleChoice,
  NoteBundle,
  ReviewSchedule,
  SubjectFolder,
} from '@/lib/domain/types';
import { moveBundleToSubject as moveBundleToSubjectData } from '@/lib/domain/move-bundle';
import { removePageFromData } from '@/lib/domain/remove-page';
import { buildDateRibbonMarks, getDueBundlesForDate } from '@/lib/domain/ribbon';
import { isDueToday, advanceAfterReview, resetReviewCycle, maintainReviewCycle } from '@/lib/spacing/engine';
import {
  createTrashLifecycle,
  filterActiveTrash,
  canRestoreFromBackup,
} from '@/lib/trash/lifecycle';
import { ensureGoogleDriveSession, getValidAccessToken } from '@/services/cloud/google-session';
import { createStorageProvider, checkFreemiumLimits, countPages } from '@/services/storage';
import { runAutoRecovery, stampRecoverySettings, type AutoRecoverySource } from '@/services/storage/auto-recovery';
import { hasRecoverableContent } from '@/services/storage/data-safety';
import { clearGuestSession } from '@/services/storage/guest-session';
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
  /** After sign-in/out — reloads the correct per-account partition (and Drive if needed). */
  reloadAccountData: () => Promise<void>;
  capturePhoto: (imageUri: string, subjectId: string, studyDate?: string) => Promise<string | null>;
  captureFlashcardPair: (
    frontUri: string,
    backUri: string | null,
    subjectId: string,
    studyDate?: string
  ) => Promise<string | null>;
  importPhotosToSubject: (
    subjectId: string,
    imageUris: string[],
    studyDate?: string
  ) => Promise<number>;
  importPhotosToBundle: (bundleId: string, imageUris: string[]) => Promise<number>;
  addSubject: (name: string, scheduleId: string) => void;
  setSubjectSchedule: (subjectId: string, scheduleId: string) => void;
  toggleActiveSchedule: (id: string) => void;
  updateBundle: (id: string, patch: Partial<NoteBundle>) => void;
  completeReview: (bundleId: string) => void;
  archiveBundle: (id: string) => void;
  moveBundleToTrash: (id: string) => void;
  deletePage: (bundleId: string, pageId: string) => void;
  restoreTrash: (trashId: string) => void;
  applyLayerCycleChoice: (bundleId: string, choice: LayerCycleChoice) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  getSchedule: (id: string) => ReviewSchedule | undefined;
  syncCloud: () => Promise<void>;
  restoreFromCloudBackup: () => Promise<boolean>;
  restoreLocalBackup: () => Promise<boolean>;
  /** Rebuild thumbs/previews from stored masters (existing photos). */
  upgradePhotoQuality: (force?: boolean) => Promise<{ upgraded: number; unchanged: number }>;
  autoRecoveryNotice: AutoRecoverySource | null;
  dismissAutoRecoveryNotice: () => void;
  derivativeRegenNotice: { failed: number } | null;
  dismissDerivativeRegenNotice: () => void;
  movingBundleId: string | null;
  dragSourceSubjectId: string | null;
  dragHoverSubjectId: string | null;
  startMovingBundle: (bundleId: string, sourceSubjectId: string) => void;
  cancelMovingBundle: () => void;
  registerSubjectDropZone: (
    subjectId: string,
    rect: { x: number; y: number; width: number; height: number } | null
  ) => void;
  updateDragHover: (pageX: number, pageY: number) => void;
  finishBundleDrop: (pageX: number, pageY: number) => string | null;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const storage = useMemo(() => createStorageProvider(), []);
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<AppData | null>(null);
  const localToday = useLocalCalendarDay();
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [autoRecoveryNotice, setAutoRecoveryNotice] = useState<AutoRecoverySource | null>(null);
  const [derivativeRegenNotice, setDerivativeRegenNotice] = useState<{ failed: number } | null>(
    null
  );
  const [movingBundleId, setMovingBundleId] = useState<string | null>(null);
  const [dragSourceSubjectId, setDragSourceSubjectId] = useState<string | null>(null);
  const [dragHoverSubjectId, setDragHoverSubjectId] = useState<string | null>(null);
  const dropZonesRef = useRef<Map<string, { x: number; y: number; width: number; height: number }>>(
    new Map()
  );
  const prevLocalTodayRef = useRef(localToday);
  const dataRef = useRef<AppData | null>(null);
  const skipPersistRef = useRef(false);

  const hydrateFromStorage = useCallback(
    async (options?: { clearGuestFirst?: boolean }) => {
      if (options?.clearGuestFirst) clearGuestSession();
      await ensureGoogleDriveSession();

      let loaded = await storage.loadAppData();
      const token = await getValidAccessToken();

      if (token && !hasRecoverableContent(loaded)) {
        const fromCloud = await storage.restoreFromCloudBackup();
        if (fromCloud && hasRecoverableContent(fromCloud)) {
          loaded = fromCloud;
        } else {
          const fromLocal = await storage.restoreLocalBackup();
          if (fromLocal && hasRecoverableContent(fromLocal)) {
            loaded = fromLocal;
          }
        }
      }

      const activeTrash = filterActiveTrash(loaded.trash);
      let next = { ...loaded, trash: activeTrash };

      const recovery = await runAutoRecovery(storage, next);
      next = { ...recovery.data, trash: filterActiveTrash(recovery.data.trash) };

      let recoveryNotice: AutoRecoverySource | null = null;
      if (recovery.recovered && recovery.source) {
        recoveryNotice = recovery.source;
      } else if (hasRecoverableContent(next)) {
        const stamped = await stampRecoverySettings(next);
        if (JSON.stringify(stamped.settings) !== JSON.stringify(next.settings)) {
          next = stamped;
          await storage.saveAppData(stamped);
        }
      }

      return { next, recoveryNotice };
    },
    [storage]
  );

  const applyLoadedData = useCallback((next: AppData, recoveryNotice: AutoRecoverySource | null) => {
    if (recoveryNotice) setAutoRecoveryNotice(recoveryNotice);
    const failed = next.settings.lastDerivativeRegenFailed ?? 0;
    setDerivativeRegenNotice(failed > 0 ? { failed } : null);
    setData(next);
    initI18n(next.settings.language);
  }, []);

  const load = useCallback(async () => {
    const { next, recoveryNotice } = await hydrateFromStorage();
    applyLoadedData(next, recoveryNotice);
    setReady(true);
  }, [hydrateFromStorage, applyLoadedData]);

  const reloadAccountData = useCallback(async () => {
    skipPersistRef.current = true;
    try {
      const { next, recoveryNotice } = await hydrateFromStorage({ clearGuestFirst: true });
      applyLoadedData(next, recoveryNotice);
    } finally {
      skipPersistRef.current = false;
    }
  }, [hydrateFromStorage, applyLoadedData]);

  const dismissAutoRecoveryNotice = useCallback(() => {
    setAutoRecoveryNotice(null);
  }, []);

  const dismissDerivativeRegenNotice = useCallback(() => {
    setDerivativeRegenNotice(null);
    setData((prev) => {
      if (!prev) return prev;
      const patched = {
        ...prev,
        settings: { ...prev.settings, lastDerivativeRegenFailed: 0 },
      };
      void storage.saveAppData(patched);
      return patched;
    });
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
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (!ready || !data || skipPersistRef.current) return;
    storage.saveAppData(data);
  }, [data, ready, storage]);

  const persist = useCallback((next: AppData) => {
    dataRef.current = next;
    setData(next);
  }, []);

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

  const captureFlashcardPair = useCallback(
    async (
      frontUri: string,
      backUri: string | null,
      subjectId: string,
      studyDate?: string
    ) => {
      const prev = dataRef.current;
      if (!prev) return null;
      const check = checkFreemiumLimits(prev);
      if (!check.allowed) {
        setPaywallVisible(true);
        return null;
      }
      const { data: next, bundleId } = await appendCaptureToData(storage, prev, {
        imageUri: frontUri,
        answerImageUri: backUri,
        subjectId,
        studyDate,
      });
      persist(next);
      return bundleId;
    },
    [storage, persist]
  );

  const capturePhoto = useCallback(
    async (imageUri: string, subjectId: string, studyDate?: string) => {
      return captureFlashcardPair(imageUri, null, subjectId, studyDate);
    },
    [captureFlashcardPair]
  );

  const importPhotosToSubject = useCallback(
    async (subjectId: string, imageUris: string[], studyDate?: string) => {
      if (imageUris.length === 0) return 0;
      let prev = dataRef.current;
      if (!prev) return 0;

      const chunks =
        imageUris.length === 2
          ? [{ front: imageUris[0], back: imageUris[1] }]
          : imageUris.map((uri) => ({ front: uri, back: null as string | null }));

      let saved = 0;
      for (const chunk of chunks) {
        const check = checkFreemiumLimits(prev);
        if (!check.allowed) {
          setPaywallVisible(true);
          break;
        }
        const result = await appendCaptureToData(storage, prev, {
          imageUri: chunk.front,
          answerImageUri: chunk.back,
          subjectId,
          studyDate,
        });
        prev = result.data;
        saved += 1;
      }

      if (saved > 0) persist(prev);
      return saved;
    },
    [storage, persist]
  );

  const importPhotosToBundle = useCallback(
    async (bundleId: string, imageUris: string[]) => {
      const bundle = dataRef.current?.bundles.find((b) => b.id === bundleId);
      if (!bundle || imageUris.length === 0) return 0;
      return importPhotosToSubject(bundle.subjectId, imageUris, bundle.studyDate);
    },
    [importPhotosToSubject]
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

  const deletePage = useCallback((bundleId: string, pageId: string) => {
    setData((prev) => {
      if (!prev) return prev;
      const { data: next, bundleRemoved, removedBundle } = removePageFromData(
        prev,
        bundleId,
        pageId
      );
      if (bundleRemoved && removedBundle) {
        return {
          ...next,
          trash: [createTrashLifecycle(removedBundle), ...next.trash],
        };
      }
      return next;
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

  const restoreFromCloudBackup = useCallback(async () => {
    const restored = await storage.restoreFromCloudBackup();
    if (!restored) return false;
    const activeTrash = filterActiveTrash(restored.trash);
    persist({ ...restored, trash: activeTrash });
    return true;
  }, [storage, persist]);

  const restoreLocalBackup = useCallback(async () => {
    const restored = await storage.restoreLocalBackup();
    if (!restored) return false;
    const activeTrash = filterActiveTrash(restored.trash);
    persist({ ...restored, trash: activeTrash });
    return true;
  }, [storage, persist]);

  const upgradePhotoQuality = useCallback(
    async (force = false) => {
      const current = dataRef.current;
      if (!current) return { upgraded: 0, unchanged: 0 };
      const upgraded = await upgradeLegacyPhotoQuality(current, { force });
      const derivatives = await ensureAppDataDerivatives(upgraded.data);
      const activeTrash = filterActiveTrash(derivatives.data.trash);
      const next = {
        ...derivatives.data,
        trash: activeTrash,
        settings: {
          ...derivatives.data.settings,
          lastDerivativeRegenAt: new Date().toISOString(),
          lastDerivativeRegenFailed: derivatives.failed,
        },
      };
      await storage.saveAppData(next);
      persist(next);
      if (derivatives.failed > 0) {
        setDerivativeRegenNotice({ failed: derivatives.failed });
      }
      return { upgraded: upgraded.upgraded, unchanged: upgraded.unchanged };
    },
    [storage, persist]
  );

  const startMovingBundle = useCallback((bundleId: string, sourceSubjectId: string) => {
    setMovingBundleId(bundleId);
    setDragSourceSubjectId(sourceSubjectId);
    setDragHoverSubjectId(null);
  }, []);

  const cancelMovingBundle = useCallback(() => {
    setMovingBundleId(null);
    setDragSourceSubjectId(null);
    setDragHoverSubjectId(null);
  }, []);

  const registerSubjectDropZone = useCallback(
    (subjectId: string, rect: { x: number; y: number; width: number; height: number } | null) => {
      if (rect) dropZonesRef.current.set(subjectId, rect);
      else dropZonesRef.current.delete(subjectId);
    },
    []
  );

  const updateDragHover = useCallback(
    (pageX: number, pageY: number) => {
      if (!movingBundleId) return;
      let found: string | null = null;
      for (const [subjectId, rect] of dropZonesRef.current.entries()) {
        if (
          pageX >= rect.x &&
          pageX <= rect.x + rect.width &&
          pageY >= rect.y &&
          pageY <= rect.y + rect.height
        ) {
          found = subjectId;
          break;
        }
      }
      const next = found && found !== dragSourceSubjectId ? found : null;
      setDragHoverSubjectId((prev) => (prev === next ? prev : next));
    },
    [dragSourceSubjectId, movingBundleId]
  );

  const finishBundleDrop = useCallback(
    (pageX: number, pageY: number) => {
      if (!data || !movingBundleId) return null;
      let target: string | null = null;
      for (const [subjectId, rect] of dropZonesRef.current.entries()) {
        if (
          pageX >= rect.x &&
          pageX <= rect.x + rect.width &&
          pageY >= rect.y &&
          pageY <= rect.y + rect.height
        ) {
          target = subjectId;
          break;
        }
      }
      if (!target || target === dragSourceSubjectId) {
        cancelMovingBundle();
        return null;
      }
      const next = moveBundleToSubjectData(data, movingBundleId, target);
      persist(next);
      const name = data.subjects.find((s) => s.id === target)?.name ?? null;
      cancelMovingBundle();
      return name;
    },
    [cancelMovingBundle, data, dragSourceSubjectId, movingBundleId, persist]
  );

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
      reloadAccountData,
      capturePhoto,
      captureFlashcardPair,
      importPhotosToSubject,
      importPhotosToBundle,
      addSubject,
      setSubjectSchedule,
      toggleActiveSchedule,
      updateBundle,
      completeReview,
      archiveBundle,
      moveBundleToTrash,
      deletePage,
      restoreTrash,
      applyLayerCycleChoice,
      updateSettings,
      getSchedule,
      syncCloud,
      restoreFromCloudBackup,
      restoreLocalBackup,
      upgradePhotoQuality,
      autoRecoveryNotice,
      dismissAutoRecoveryNotice,
      derivativeRegenNotice,
      dismissDerivativeRegenNotice,
      movingBundleId,
      dragSourceSubjectId,
      dragHoverSubjectId,
      startMovingBundle,
      cancelMovingBundle,
      registerSubjectDropZone,
      updateDragHover,
      finishBundleDrop,
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
    reloadAccountData,
    capturePhoto,
    captureFlashcardPair,
    importPhotosToSubject,
    importPhotosToBundle,
    addSubject,
    setSubjectSchedule,
    toggleActiveSchedule,
    updateBundle,
    completeReview,
    archiveBundle,
    moveBundleToTrash,
    deletePage,
    restoreTrash,
    applyLayerCycleChoice,
    updateSettings,
    getSchedule,
    syncCloud,
    restoreFromCloudBackup,
    restoreLocalBackup,
    upgradePhotoQuality,
    movingBundleId,
    dragSourceSubjectId,
    dragHoverSubjectId,
    startMovingBundle,
    cancelMovingBundle,
    registerSubjectDropZone,
    updateDragHover,
    finishBundleDrop,
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
