import type { StudySession } from './types';

export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function getFocusMinutesToday(sessions: StudySession[], date = new Date()): number {
  const key = todayKey(date);
  return sessions
    .filter((s) => s.mode === 'focus' && s.completedAt.startsWith(key))
    .reduce((sum, s) => sum + s.durationMinutes, 0);
}

export function getFocusMinutesBySubjectToday(
  sessions: StudySession[],
  date = new Date()
): Record<string, number> {
  const key = todayKey(date);
  const map: Record<string, number> = {};
  for (const s of sessions) {
    if (s.mode !== 'focus' || !s.completedAt.startsWith(key)) continue;
    map[s.subjectId] = (map[s.subjectId] ?? 0) + s.durationMinutes;
  }
  return map;
}

export function getLast7DaysFocus(sessions: StudySession[]): { label: string; minutes: number }[] {
  const result: { label: string; minutes: number }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = todayKey(d);
    const minutes = sessions
      .filter((s) => s.mode === 'focus' && s.completedAt.startsWith(key))
      .reduce((sum, s) => sum + s.durationMinutes, 0);
    const label = i === 0 ? '오늘' : `${d.getMonth() + 1}/${d.getDate()}`;
    result.push({ label, minutes });
  }
  return result;
}

export function updateStreak(
  lastStudyDate: string | null,
  streak: number,
  studyDate: string
): { lastStudyDate: string; streak: number } {
  if (lastStudyDate === studyDate) {
    return { lastStudyDate, streak };
  }
  const yesterday = new Date(studyDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = todayKey(yesterday);
  if (lastStudyDate === yesterdayKey) {
    return { lastStudyDate: studyDate, streak: streak + 1 };
  }
  return { lastStudyDate: studyDate, streak: 1 };
}
