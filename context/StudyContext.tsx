import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { DEFAULT_SETTINGS } from '@/lib/defaults';
import { loadAppData, saveAppData } from '@/lib/storage';
import { getFocusMinutesToday, todayKey, updateStreak } from '@/lib/stats';
import type { AppData, AppSettings, SessionMode, Subject, StudySession } from '@/lib/types';

type StudyContextValue = {
  ready: boolean;
  data: AppData;
  selectedSubjectId: string;
  setSelectedSubjectId: (id: string) => void;
  todayMinutes: number;
  addSubject: (name: string, color: string) => void;
  removeSubject: (id: string) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  completeSession: (mode: SessionMode, durationMinutes: number) => void;
};

const StudyContext = createContext<StudyContextValue | null>(null);

export function StudyProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<AppData | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  useEffect(() => {
    loadAppData().then((loaded) => {
      setData(loaded);
      setSelectedSubjectId(loaded.subjects[0]?.id ?? '');
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready || !data) return;
    saveAppData(data);
  }, [data, ready]);

  const todayMinutes = useMemo(
    () => (data ? getFocusMinutesToday(data.sessions) : 0),
    [data]
  );

  const addSubject = useCallback((name: string, color: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const subject: Subject = {
      id: `sub_${Date.now()}`,
      name: trimmed,
      color,
    };
    setData((prev) =>
      prev
        ? { ...prev, subjects: [...prev.subjects, subject] }
        : prev
    );
    setSelectedSubjectId(subject.id);
  }, []);

  const removeSubject = useCallback((id: string) => {
    setData((prev) => {
      if (!prev || prev.subjects.length <= 1) return prev;
      const subjects = prev.subjects.filter((s) => s.id !== id);
      setSelectedSubjectId((current) =>
        current === id ? subjects[0].id : current
      );
      return { ...prev, subjects };
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setData((prev) =>
      prev
        ? { ...prev, settings: { ...prev.settings, ...patch } }
        : prev
    );
  }, []);

  const completeSession = useCallback((mode: SessionMode, durationMinutes: number) => {
    setData((prev) => {
      if (!prev || !selectedSubjectId) return prev;
      const session: StudySession = {
        id: `sess_${Date.now()}`,
        subjectId: selectedSubjectId,
        mode,
        durationMinutes,
        completedAt: new Date().toISOString(),
      };
      const sessions = [session, ...prev.sessions].slice(0, 500);
      let next = { ...prev, sessions };
      if (mode === 'focus') {
        const studyDate = todayKey();
        const streakUpdate = updateStreak(prev.lastStudyDate, prev.streak, studyDate);
        next = { ...next, ...streakUpdate };
      }
      return next;
    });
  }, [selectedSubjectId]);

  const value = useMemo<StudyContextValue | null>(() => {
    if (!data) return null;
    return {
      ready,
      data,
      selectedSubjectId,
      setSelectedSubjectId,
      todayMinutes,
      addSubject,
      removeSubject,
      updateSettings,
      completeSession,
    };
  }, [
    ready,
    data,
    selectedSubjectId,
    todayMinutes,
    addSubject,
    removeSubject,
    updateSettings,
    completeSession,
  ]);

  if (!value) return null;
  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
}

export function useStudy() {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error('useStudy must be used within StudyProvider');
  return ctx;
}

export function useStudySettings() {
  const { data } = useStudy();
  return data.settings ?? DEFAULT_SETTINGS;
}
