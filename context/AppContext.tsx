import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { folderColor } from '@/constants/theme';
import { initI18n } from '@/i18n';
import { loadAppData, saveAppData } from '@/lib/storage';
import { isDueToday } from '@/lib/review';
import { shouldAutoDeleteFromTrash } from '@/lib/trash';
import type {
  AppData,
  AppSettings,
  Folder,
  ReviewSchedule,
  StudyItem,
  Language,
} from '@/lib/types';

type AppContextValue = {
  ready: boolean;
  data: AppData;
  dueToday: StudyItem[];
  refresh: () => void;
  addFolder: (name: string, scheduleId: string) => void;
  setFolderSchedule: (folderId: string, scheduleId: string) => void;
  toggleActiveSchedule: (scheduleId: string) => void;
  addItem: (item: Omit<StudyItem, 'id' | 'createdAt' | 'layers' | 'reviewStepIndex' | 'lastReviewedAt'>) => string;
  updateItem: (id: string, patch: Partial<StudyItem>) => void;
  moveItemToTrash: (id: string) => void;
  restoreFromTrash: (trashId: string) => void;
  purgeTrash: () => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  getSchedule: (id: string) => ReviewSchedule | undefined;
  photoCount: number;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<AppData | null>(null);

  const load = useCallback(async () => {
    const loaded = await loadAppData();
    const trash = loaded.trash.filter((t) => !shouldAutoDeleteFromTrash(t));
    setData({ ...loaded, trash });
    initI18n(loaded.settings.language);
    setReady(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!ready || !data) return;
    saveAppData(data);
  }, [data, ready]);

  const getSchedule = useCallback(
    (id: string) => data?.schedules.find((s) => s.id === id),
    [data]
  );

  const dueToday = useMemo(() => {
    if (!data) return [];
    return data.items.filter((item) => {
      const schedule = getSchedule(item.reviewScheduleId);
      if (!schedule) return false;
      return isDueToday(item, schedule);
    });
  }, [data, getSchedule]);

  const photoCount = data?.items.length ?? 0;

  const addFolder = useCallback((name: string, scheduleId: string) => {
    const id = `folder_${Date.now()}`;
    const folder: Folder = {
      id,
      name: name.trim(),
      reviewScheduleId: scheduleId,
      color: folderColor(id),
      createdAt: new Date().toISOString(),
    };
    setData((prev) => (prev ? { ...prev, folders: [...prev.folders, folder] } : prev));
  }, []);

  const setFolderSchedule = useCallback((folderId: string, scheduleId: string) => {
    setData((prev) => {
      if (!prev) return prev;
      if (!prev.settings.activeScheduleIds.includes(scheduleId)) return prev;
      return {
        ...prev,
        folders: prev.folders.map((f) =>
          f.id === folderId ? { ...f, reviewScheduleId: scheduleId } : f
        ),
      };
    });
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

  const addItem = useCallback(
    (partial: Omit<StudyItem, 'id' | 'createdAt' | 'layers' | 'reviewStepIndex' | 'lastReviewedAt'>) => {
      const id = `item_${Date.now()}`;
      const item: StudyItem = {
        ...partial,
        id,
        layers: [],
        reviewStepIndex: 0,
        lastReviewedAt: null,
        createdAt: new Date().toISOString(),
      };
      setData((prev) => (prev ? { ...prev, items: [item, ...prev.items] } : prev));
      return id;
    },
    []
  );

  const updateItem = useCallback((id: string, patch: Partial<StudyItem>) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
          }
        : prev
    );
  }, []);

  const moveItemToTrash = useCallback((id: string) => {
    setData((prev) => {
      if (!prev) return prev;
      const item = prev.items.find((i) => i.id === id);
      if (!item) return prev;
      return {
        ...prev,
        items: prev.items.filter((i) => i.id !== id),
        trash: [
          { id: `trash_${Date.now()}`, item, deletedAt: new Date().toISOString() },
          ...prev.trash,
        ],
      };
    });
  }, []);

  const restoreFromTrash = useCallback((trashId: string) => {
    setData((prev) => {
      if (!prev) return prev;
      const entry = prev.trash.find((t) => t.id === trashId);
      if (!entry) return prev;
      return {
        ...prev,
        items: [entry.item, ...prev.items],
        trash: prev.trash.filter((t) => t.id !== trashId),
      };
    });
  }, []);

  const purgeTrash = useCallback(() => {
    setData((prev) =>
      prev ? { ...prev, trash: prev.trash.filter((t) => !shouldAutoDeleteFromTrash(t)) } : prev
    );
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setData((prev) => {
      if (!prev) return prev;
      const settings = { ...prev.settings, ...patch };
      if (patch.language) initI18n(patch.language);
      return { ...prev, settings };
    });
  }, []);

  const value = useMemo<AppContextValue | null>(() => {
    if (!data) return null;
    return {
      ready,
      data,
      dueToday,
      refresh: load,
      addFolder,
      setFolderSchedule,
      toggleActiveSchedule,
      addItem,
      updateItem,
      moveItemToTrash,
      restoreFromTrash,
      purgeTrash,
      updateSettings,
      getSchedule,
      photoCount,
    };
  }, [
    ready,
    data,
    dueToday,
    load,
    addFolder,
    setFolderSchedule,
    toggleActiveSchedule,
    addItem,
    updateItem,
    moveItemToTrash,
    restoreFromTrash,
    purgeTrash,
    updateSettings,
    getSchedule,
    photoCount,
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
