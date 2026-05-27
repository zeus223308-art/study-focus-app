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
import { mergeBundlesIntoTarget } from '@/lib/domain/merge-bundles';
import { mergeSubjectsIntoTarget } from '@/lib/domain/merge-subjects';
import { moveBundleToSubject as moveBundleToSubjectData } from '@/lib/domain/move-bundle';
import { removePageFromData } from '@/lib/domain/remove-page';
import { splitPageToNewBundle as splitPageToNewBundleData } from '@/lib/domain/split-page';
import {
  mergeItemOrder,
  reorderItemKeys,
  reorderSubjectFolders,
  reorderSubjectToGap,
} from '@/lib/domain/reorder';
import {
  resolveSubjectMergeTargetId,
  resolveSubjectReorderGapKey,
} from '@/lib/ui/subject-reorder-hit';
import { isSubjectDragDeleteIntent, type DragLiftPoint } from '@/lib/ui/subject-drag-delete';
import { listSubjectProblems } from '@/lib/grouping/bundles';
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
  renameSubject: (subjectId: string, name: string) => void;
  deleteSubject: (subjectId: string) => void;
  setSubjectSchedule: (subjectId: string, scheduleId: string) => void;
  toggleActiveSchedule: (id: string) => void;
  updateBundle: (id: string, patch: Partial<NoteBundle>) => void;
  completeReview: (bundleId: string) => void;
  archiveBundle: (id: string) => void;
  unarchiveBundle: (id: string) => void;
  moveBundleToTrash: (id: string) => void;
  deletePage: (bundleId: string, pageId: string) => void;
  mergeBundlesWithTitle: (sourceBundleId: string, targetBundleId: string, title: string) => void;
  mergeSubjectsWithName: (sourceSubjectId: string, targetSubjectId: string, name: string) => void;
  splitPageToNewBundle: (
    bundleId: string,
    pageId: string,
    title: string,
    targetSubjectId: string
  ) => void;
  pendingMerge:
    | { kind: 'bundle'; sourceBundleId: string; targetBundleId: string }
    | { kind: 'subject'; sourceSubjectId: string; targetSubjectId: string }
    | null;
  consumePendingMerge: () =>
    | { kind: 'bundle'; sourceBundleId: string; targetBundleId: string }
    | { kind: 'subject'; sourceSubjectId: string; targetSubjectId: string }
    | null;
  clearPendingMerge: () => void;
  mergeDraggingSubjectId: string | null;
  startMergeBundleDrag: (
    bundleId: string,
    pageId: string,
    subjectId: string,
    itemKey: string
  ) => void;
  startMergeSubjectDrag: (subjectId: string) => void;
  finishSubjectMergeDrag: (
    pageX: number,
    pageY: number,
    moved: boolean
  ) => 'merge' | 'cancelled';
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
  draggingItemKey: string | null;
  dragSourceSubjectId: string | null;
  dragHoverSubjectId: string | null;
  dragHoverItemKey: string | null;
  reorderingSubjectId: string | null;
  reorderHoverSubjectId: string | null;
  /** Bumps when carousel scrolls during reorder so drop zones re-measure. */
  subjectReorderMeasureTick: number;
  bumpSubjectReorderMeasure: () => void;
  startItemDrag: (bundleId: string, pageId: string, subjectId: string, itemKey: string) => void;
  startMovingBundle: (bundleId: string, sourceSubjectId: string) => void;
  startSubjectReorder: (subjectId: string, lift?: DragLiftPoint) => void;
  cancelMovingBundle: () => void;
  registerSubjectDropZone: (
    subjectId: string,
    rect: { x: number; y: number; width: number; height: number } | null
  ) => void;
  registerItemDropZone: (
    itemKey: string,
    rect: { x: number; y: number; width: number; height: number } | null
  ) => void;
  registerSubjectReorderZone: (
    subjectId: string,
    rect: { x: number; y: number; width: number; height: number } | null
  ) => void;
  registerSubjectReorderGapZone: (
    gapKey: string,
    rect: { x: number; y: number; width: number; height: number } | null
  ) => void;
  registerSubjectMergeZone: (
    subjectId: string,
    rect: { x: number; y: number; width: number; height: number } | null
  ) => void;
  reorderHoverGapKey: string | null;
  updateDragHover: (pageX: number, pageY: number) => void;
  updateSubjectReorderHover: (pageX: number, pageY: number) => void;
  finishItemDrag: (
    pageX: number,
    pageY: number,
    moved: boolean
  ) => 'reordered' | 'moved' | 'merge' | 'cancelled';
  finishSubjectReorder: (
    pageX: number,
    pageY: number,
    moved: boolean
  ) => 'reordered' | 'trashed' | 'cancelled';
  finishBundleDrop: (pageX: number, pageY: number) => string | null;
  reorderSubjects: (activeId: string, overId: string) => void;
  /** Tap target folder while reordering (works without drag). */
  dropSubjectReorderOn: (overId: string) => boolean;
  /** Tap target photo while reordering (works without drag). */
  dropItemReorderOn: (overKey: string) => boolean;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
  children,
  onReady,
}: {
  children: ReactNode;
  onReady?: () => void;
}) {
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
  const [draggingItemKey, setDraggingItemKey] = useState<string | null>(null);
  const [dragSourceSubjectId, setDragSourceSubjectId] = useState<string | null>(null);
  const [dragHoverSubjectId, setDragHoverSubjectId] = useState<string | null>(null);
  const [dragHoverItemKey, setDragHoverItemKey] = useState<string | null>(null);
  const [reorderingSubjectId, setReorderingSubjectId] = useState<string | null>(null);
  const [reorderHoverSubjectId, setReorderHoverSubjectId] = useState<string | null>(null);
  const [reorderHoverGapKey, setReorderHoverGapKey] = useState<string | null>(null);
  const [pendingMerge, setPendingMerge] = useState<
    | { kind: 'bundle'; sourceBundleId: string; targetBundleId: string }
    | { kind: 'subject'; sourceSubjectId: string; targetSubjectId: string }
    | null
  >(null);
  const [mergeDragMode, setMergeDragMode] = useState<'bundle' | 'subject' | null>(null);
  const [mergeDraggingSubjectId, setMergeDraggingSubjectId] = useState<string | null>(null);
  const [subjectReorderMeasureTick, setSubjectReorderMeasureTick] = useState(0);
  const dropZonesRef = useRef<Map<string, { x: number; y: number; width: number; height: number }>>(
    new Map()
  );
  const itemDropZonesRef = useRef<
    Map<string, { x: number; y: number; width: number; height: number }>
  >(new Map());
  const subjectReorderZonesRef = useRef<
    Map<string, { x: number; y: number; width: number; height: number }>
  >(new Map());
  const subjectReorderGapZonesRef = useRef<
    Map<string, { x: number; y: number; width: number; height: number }>
  >(new Map());
  const subjectMergeZonesRef = useRef<
    Map<string, { x: number; y: number; width: number; height: number }>
  >(new Map());
  const reorderingSubjectIdRef = useRef<string | null>(null);
  const subjectDragLiftRef = useRef<DragLiftPoint | null>(null);
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
    if (ready) onReady?.();
  }, [ready, onReady]);

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

  const renameSubject = useCallback((subjectId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setData((prev) =>
      prev
        ? {
            ...prev,
            subjects: prev.subjects.map((s) =>
              s.id === subjectId ? { ...s, name: trimmed } : s
            ),
          }
        : prev
    );
  }, []);

  const deleteSubject = useCallback((subjectId: string) => {
    setData((prev) => {
      if (!prev) return prev;
      const subjectBundles = prev.bundles.filter((b) => b.subjectId === subjectId);
      const otherBundles = prev.bundles.filter((b) => b.subjectId !== subjectId);
      return {
        ...prev,
        subjects: prev.subjects.filter((s) => s.id !== subjectId),
        bundles: otherBundles,
        trash: [...subjectBundles.map((b) => createTrashLifecycle(b)), ...prev.trash],
      };
    });
  }, []);

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

  const unarchiveBundle = useCallback((id: string) => {
    updateBundle(id, { archived: false, archivedAt: null });
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

  const clearPendingMerge = useCallback(() => setPendingMerge(null), []);

  const consumePendingMerge = useCallback(() => {
    let next:
      | { kind: 'bundle'; sourceBundleId: string; targetBundleId: string }
      | { kind: 'subject'; sourceSubjectId: string; targetSubjectId: string }
      | null = null;
    setPendingMerge((prev) => {
      next = prev;
      return null;
    });
    return next;
  }, []);

  const mergeBundlesWithTitle = useCallback(
    (sourceBundleId: string, targetBundleId: string, title: string) => {
      setData((prev) => {
        if (!prev) return prev;
        return mergeBundlesIntoTarget(prev, sourceBundleId, targetBundleId, title);
      });
      setPendingMerge(null);
      setMergeDragMode(null);
    },
    []
  );

  const mergeSubjectsWithName = useCallback(
    (sourceSubjectId: string, targetSubjectId: string, name: string) => {
      setData((prev) => {
        if (!prev) return prev;
        return mergeSubjectsIntoTarget(prev, sourceSubjectId, targetSubjectId, name);
      });
      setPendingMerge(null);
      setMergeDragMode(null);
      setMergeDraggingSubjectId(null);
    },
    []
  );

  const splitPageToNewBundle = useCallback(
    (bundleId: string, pageId: string, title: string, targetSubjectId: string) => {
      setData((prev) => {
        if (!prev) return prev;
        return splitPageToNewBundleData(prev, bundleId, pageId, title, targetSubjectId);
      });
    },
    []
  );

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

  const bumpSubjectReorderMeasure = useCallback(() => {
    setSubjectReorderMeasureTick((t) => t + 1);
  }, []);

  const startMovingBundle = useCallback((bundleId: string, sourceSubjectId: string) => {
    setMovingBundleId(bundleId);
    setDragSourceSubjectId(sourceSubjectId);
    setDragHoverSubjectId(null);
    setDragHoverItemKey(null);
  }, []);

  const startItemDrag = useCallback(
    (bundleId: string, _pageId: string, subjectId: string, itemKey: string) => {
      setMergeDragMode(null);
      setMergeDraggingSubjectId(null);
      setMovingBundleId(bundleId);
      setDraggingItemKey(itemKey);
      setDragSourceSubjectId(subjectId);
      setDragHoverSubjectId(null);
      setDragHoverItemKey(null);
      reorderingSubjectIdRef.current = null;
      setReorderingSubjectId(null);
      setReorderHoverSubjectId(null);
      setReorderHoverGapKey(null);
    },
    []
  );

  const startMergeBundleDrag = useCallback(
    (bundleId: string, _pageId: string, subjectId: string, itemKey: string) => {
      setMergeDragMode('bundle');
      setMergeDraggingSubjectId(null);
      setMovingBundleId(bundleId);
      setDraggingItemKey(itemKey);
      setDragSourceSubjectId(subjectId);
      setDragHoverSubjectId(null);
      setDragHoverItemKey(null);
      reorderingSubjectIdRef.current = null;
      setReorderingSubjectId(null);
      setReorderHoverSubjectId(null);
      setReorderHoverGapKey(null);
    },
    []
  );

  const startMergeSubjectDrag = useCallback((subjectId: string) => {
    setMergeDragMode('subject');
    setMergeDraggingSubjectId(subjectId);
    setMovingBundleId(null);
    setDraggingItemKey(null);
    setDragSourceSubjectId(subjectId);
    setDragHoverSubjectId(null);
    setDragHoverItemKey(null);
    reorderingSubjectIdRef.current = null;
    setReorderingSubjectId(null);
    setReorderHoverSubjectId(null);
    setReorderHoverGapKey(null);
    bumpSubjectReorderMeasure();
    requestAnimationFrame(() => bumpSubjectReorderMeasure());
  }, [bumpSubjectReorderMeasure]);

  const startSubjectReorder = useCallback(
    (subjectId: string, lift?: DragLiftPoint) => {
      reorderingSubjectIdRef.current = subjectId;
      subjectDragLiftRef.current = lift ?? null;
      setReorderingSubjectId(subjectId);
      setReorderHoverSubjectId(null);
      setReorderHoverGapKey(null);
      setMovingBundleId(null);
      setDraggingItemKey(null);
      setDragSourceSubjectId(null);
      setDragHoverSubjectId(null);
      setDragHoverItemKey(null);
      bumpSubjectReorderMeasure();
      requestAnimationFrame(() => bumpSubjectReorderMeasure());
    },
    [bumpSubjectReorderMeasure]
  );

  const cancelMovingBundle = useCallback(() => {
    reorderingSubjectIdRef.current = null;
    subjectDragLiftRef.current = null;
    setMovingBundleId(null);
    setDraggingItemKey(null);
    setDragSourceSubjectId(null);
    setDragHoverSubjectId(null);
    setDragHoverItemKey(null);
    setReorderingSubjectId(null);
    setReorderHoverSubjectId(null);
    setReorderHoverGapKey(null);
    setMergeDragMode(null);
    setMergeDraggingSubjectId(null);
  }, []);

  const registerItemDropZone = useCallback(
    (itemKey: string, rect: { x: number; y: number; width: number; height: number } | null) => {
      if (rect) itemDropZonesRef.current.set(itemKey, rect);
      else itemDropZonesRef.current.delete(itemKey);
    },
    []
  );

  const registerSubjectReorderZone = useCallback(
    (subjectId: string, rect: { x: number; y: number; width: number; height: number } | null) => {
      if (rect) subjectReorderZonesRef.current.set(subjectId, rect);
      else subjectReorderZonesRef.current.delete(subjectId);
    },
    []
  );

  const registerSubjectReorderGapZone = useCallback(
    (gapKey: string, rect: { x: number; y: number; width: number; height: number } | null) => {
      if (rect) subjectReorderGapZonesRef.current.set(gapKey, rect);
      else subjectReorderGapZonesRef.current.delete(gapKey);
    },
    []
  );

  const registerSubjectMergeZone = useCallback(
    (subjectId: string, rect: { x: number; y: number; width: number; height: number } | null) => {
      if (rect) subjectMergeZonesRef.current.set(subjectId, rect);
      else subjectMergeZonesRef.current.delete(subjectId);
    },
    []
  );

  const hitTestZones = useCallback(
    (pageX: number, pageY: number, zones: Map<string, { x: number; y: number; width: number; height: number }>) => {
      for (const [key, rect] of zones.entries()) {
        if (
          pageX >= rect.x &&
          pageX <= rect.x + rect.width &&
          pageY >= rect.y &&
          pageY <= rect.y + rect.height
        ) {
          return key;
        }
      }
      return null;
    },
    []
  );

  const getSortedSubjectIds = useCallback((): string[] => {
    if (!data) return [];
    return [...data.subjects]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => s.id);
  }, [data]);

  const reorderSubjects = useCallback((activeId: string, overId: string) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        subjects: reorderSubjectFolders(prev.subjects, activeId, overId),
      };
    });
  }, []);

  const reorderSubjectItems = useCallback(
    (subjectId: string, activeKey: string, overKey: string) => {
      setData((prev) => {
        if (!prev) return prev;
        const subject = prev.subjects.find((s) => s.id === subjectId);
        if (!subject) return prev;
        const problems = listSubjectProblems(prev.bundles, subjectId, subject.itemOrder);
        const keys = problems.map((p) => `${p.bundleId}:${p.pageId}`);
        const merged = mergeItemOrder(subject.itemOrder, keys);
        const nextOrder = reorderItemKeys(merged, activeKey, overKey);
        return {
          ...prev,
          subjects: prev.subjects.map((s) =>
            s.id === subjectId ? { ...s, itemOrder: nextOrder } : s
          ),
        };
      });
    },
    []
  );

  const updateSubjectReorderHover = useCallback(
    (pageX: number, pageY: number) => {
      const sortedIds = getSortedSubjectIds();
      if (mergeDraggingSubjectId) {
        const next =
          resolveSubjectMergeTargetId(
            pageX,
            pageY,
            subjectMergeZonesRef.current,
            sortedIds,
            mergeDraggingSubjectId
          ) ?? null;
        setReorderHoverSubjectId((prev) => (prev === next ? prev : next));
        setReorderHoverGapKey((prev) => (prev === null ? prev : null));
        return;
      }
      if (!reorderingSubjectIdRef.current) return;
      if (!subjectDragLiftRef.current) {
        subjectDragLiftRef.current = { x: pageX, y: pageY };
      }
      const lift = subjectDragLiftRef.current;
      if (isSubjectDragDeleteIntent(pageX, pageY, lift)) {
        setReorderHoverGapKey((prev) => (prev === null ? prev : null));
        return;
      }
      const gap = resolveSubjectReorderGapKey(
        pageX,
        pageY,
        subjectReorderGapZonesRef.current,
        subjectMergeZonesRef.current,
        sortedIds
      );
      setReorderHoverGapKey((prev) => (prev === gap ? prev : gap));
      setReorderHoverSubjectId((prev) => (prev === null ? prev : null));
    },
    [getSortedSubjectIds, mergeDraggingSubjectId]
  );

  const finishSubjectMergeDrag = useCallback(
    (pageX: number, pageY: number, moved: boolean): 'merge' | 'cancelled' => {
      if (!mergeDraggingSubjectId) {
        cancelMovingBundle();
        return 'cancelled';
      }
      const sortedIds = getSortedSubjectIds();
      const hover =
        resolveSubjectMergeTargetId(
          pageX,
          pageY,
          subjectMergeZonesRef.current,
          sortedIds,
          mergeDraggingSubjectId
        ) ?? reorderHoverSubjectId;
      if (!moved && !hover) {
        cancelMovingBundle();
        return 'cancelled';
      }
      const sourceId = mergeDraggingSubjectId;
      if (hover && hover !== sourceId) {
        setPendingMerge({
          kind: 'subject',
          sourceSubjectId: sourceId,
          targetSubjectId: hover,
        });
        cancelMovingBundle();
        return 'merge';
      }
      cancelMovingBundle();
      return 'cancelled';
    },
    [cancelMovingBundle, getSortedSubjectIds, mergeDraggingSubjectId, reorderHoverSubjectId]
  );

  const finishSubjectReorder = useCallback(
    (pageX: number, pageY: number, _moved: boolean): 'reordered' | 'trashed' | 'cancelled' => {
      const activeId = reorderingSubjectIdRef.current;
      if (!activeId) return 'cancelled';
      const onTrash = isSubjectDragDeleteIntent(
        pageX,
        pageY,
        subjectDragLiftRef.current
      );
      if (onTrash) {
        cancelMovingBundle();
        return 'trashed';
      }
      const gapKey =
        resolveSubjectReorderGapKey(
          pageX,
          pageY,
          subjectReorderGapZonesRef.current,
          subjectMergeZonesRef.current,
          getSortedSubjectIds()
        ) ?? reorderHoverGapKey;
      if (gapKey?.startsWith('gap:')) {
        const gapIndex = Number.parseInt(gapKey.slice(4), 10);
        if (!Number.isNaN(gapIndex)) {
          setData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              subjects: reorderSubjectToGap(prev.subjects, activeId, gapIndex),
            };
          });
          cancelMovingBundle();
          return 'reordered';
        }
      }
      cancelMovingBundle();
      return 'cancelled';
    },
    [cancelMovingBundle, getSortedSubjectIds, reorderHoverGapKey]
  );

  const dropSubjectReorderOn = useCallback(
    (overId: string): boolean => {
      if (!reorderingSubjectId || reorderingSubjectId === overId) return false;
      reorderSubjects(reorderingSubjectId, overId);
      cancelMovingBundle();
      return true;
    },
    [cancelMovingBundle, reorderSubjects, reorderingSubjectId]
  );

  const dropItemReorderOn = useCallback(
    (overKey: string): boolean => {
      if (!movingBundleId || !draggingItemKey || !dragSourceSubjectId) return false;
      if (overKey === draggingItemKey) return false;
      reorderSubjectItems(dragSourceSubjectId, draggingItemKey, overKey);
      cancelMovingBundle();
      return true;
    },
    [cancelMovingBundle, dragSourceSubjectId, draggingItemKey, movingBundleId, reorderSubjectItems]
  );

  const finishItemDrag = useCallback(
    (pageX: number, pageY: number, moved: boolean): 'reordered' | 'moved' | 'merge' | 'cancelled' => {
      if (!movingBundleId || !dragSourceSubjectId) {
        cancelMovingBundle();
        return 'cancelled';
      }

      const hoverItem =
        hitTestZones(pageX, pageY, itemDropZonesRef.current) ?? dragHoverItemKey;
      if (!moved && mergeDragMode !== 'bundle') {
        cancelMovingBundle();
        return 'cancelled';
      }
      if (!moved && mergeDragMode === 'bundle' && !hoverItem) {
        cancelMovingBundle();
        return 'cancelled';
      }

      if (hoverItem && draggingItemKey && hoverItem !== draggingItemKey) {
        const targetBundleId = hoverItem.split(':')[0]!;
        if (targetBundleId !== movingBundleId && mergeDragMode === 'bundle') {
          setPendingMerge({
            kind: 'bundle',
            sourceBundleId: movingBundleId,
            targetBundleId,
          });
          cancelMovingBundle();
          return 'merge';
        }
        if (targetBundleId === movingBundleId) {
          reorderSubjectItems(dragSourceSubjectId, draggingItemKey, hoverItem);
          cancelMovingBundle();
          return 'reordered';
        }
      }

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
      if (
        target &&
        target !== dragSourceSubjectId &&
        data &&
        mergeDragMode !== 'bundle'
      ) {
        const next = moveBundleToSubjectData(data, movingBundleId, target);
        persist(next);
        cancelMovingBundle();
        return 'moved';
      }

      cancelMovingBundle();
      return 'cancelled';
    },
    [
      cancelMovingBundle,
      data,
      dragHoverItemKey,
      dragSourceSubjectId,
      draggingItemKey,
      hitTestZones,
      mergeDragMode,
      movingBundleId,
      persist,
      reorderSubjectItems,
    ]
  );

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
      const itemFound = hitTestZones(pageX, pageY, itemDropZonesRef.current);
      const itemNext =
        itemFound && itemFound !== draggingItemKey ? itemFound : null;
      setDragHoverItemKey((prev) => (prev === itemNext ? prev : itemNext));

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
    [dragSourceSubjectId, draggingItemKey, hitTestZones, movingBundleId]
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
      renameSubject,
      deleteSubject,
      setSubjectSchedule,
      toggleActiveSchedule,
      updateBundle,
      completeReview,
      archiveBundle,
      unarchiveBundle,
      moveBundleToTrash,
      deletePage,
      mergeBundlesWithTitle,
      mergeSubjectsWithName,
      splitPageToNewBundle,
      pendingMerge,
      consumePendingMerge,
      clearPendingMerge,
      mergeDraggingSubjectId,
      startMergeBundleDrag,
      startMergeSubjectDrag,
      finishSubjectMergeDrag,
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
      draggingItemKey,
      dragSourceSubjectId,
      dragHoverSubjectId,
      dragHoverItemKey,
      reorderingSubjectId,
      reorderHoverSubjectId,
      reorderHoverGapKey,
      subjectReorderMeasureTick,
      bumpSubjectReorderMeasure,
      startItemDrag,
      startMovingBundle,
      startSubjectReorder,
      cancelMovingBundle,
      registerSubjectDropZone,
      registerItemDropZone,
      registerSubjectReorderZone,
      registerSubjectReorderGapZone,
      registerSubjectMergeZone,
      updateDragHover,
      updateSubjectReorderHover,
      finishItemDrag,
      finishSubjectReorder,
      finishBundleDrop,
      reorderSubjects,
      dropSubjectReorderOn,
      dropItemReorderOn,
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
    renameSubject,
    deleteSubject,
    setSubjectSchedule,
    toggleActiveSchedule,
    updateBundle,
    completeReview,
    archiveBundle,
    unarchiveBundle,
    moveBundleToTrash,
    deletePage,
    mergeBundlesWithTitle,
    splitPageToNewBundle,
    consumePendingMerge,
    clearPendingMerge,
    restoreTrash,
    applyLayerCycleChoice,
    updateSettings,
    getSchedule,
    syncCloud,
    restoreFromCloudBackup,
    restoreLocalBackup,
    upgradePhotoQuality,
    movingBundleId,
    draggingItemKey,
    dragSourceSubjectId,
    dragHoverSubjectId,
    dragHoverItemKey,
    reorderingSubjectId,
    reorderHoverSubjectId,
    reorderHoverGapKey,
    pendingMerge,
    mergeDraggingSubjectId,
    mergeDragMode,
    subjectReorderMeasureTick,
    bumpSubjectReorderMeasure,
    startItemDrag,
    startMovingBundle,
    startSubjectReorder,
    cancelMovingBundle,
    registerSubjectDropZone,
    registerItemDropZone,
    registerSubjectReorderZone,
    updateDragHover,
    updateSubjectReorderHover,
    finishItemDrag,
    finishSubjectReorder,
    finishBundleDrop,
    reorderSubjects,
    dropSubjectReorderOn,
    dropItemReorderOn,
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
