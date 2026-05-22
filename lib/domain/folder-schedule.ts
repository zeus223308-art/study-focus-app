import type { Language } from './types';

export const SCHEDULE_DAILY_ID = 'sched_daily';
/** Row 1 — 이틀에 한 번 */
export const SCHEDULE_EVERY_TWO_DAYS_ID = 'sched_135714';
/** Row 3 — Premium +추가 (not used for folder toggle) */
export const SCHEDULE_ADD_ID = 'sched_2days';

/** Folder list only supports 매일 ↔ 이틀에 한번. */
export function normalizeFolderScheduleId(scheduleId: string): string {
  if (scheduleId === SCHEDULE_DAILY_ID) return SCHEDULE_DAILY_ID;
  if (scheduleId === SCHEDULE_ADD_ID) return SCHEDULE_EVERY_TWO_DAYS_ID;
  return SCHEDULE_EVERY_TWO_DAYS_ID;
}

export function toggleFolderScheduleId(scheduleId: string): string {
  const normalized = normalizeFolderScheduleId(scheduleId);
  return normalized === SCHEDULE_DAILY_ID ? SCHEDULE_EVERY_TWO_DAYS_ID : SCHEDULE_DAILY_ID;
}

export function folderScheduleLabel(
  scheduleId: string,
  language: Language,
  labels: { daily: string; everyTwoDays: string }
): string {
  return normalizeFolderScheduleId(scheduleId) === SCHEDULE_DAILY_ID
    ? labels.daily
    : labels.everyTwoDays;
}
