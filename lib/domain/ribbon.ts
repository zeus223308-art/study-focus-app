import { format, startOfDay } from 'date-fns';

import { buildRibbonDays } from './dates';
import type { AppData, DateRibbonMark, NoteBundle, ReviewSchedule } from './types';
import { getNextReviewDate, isDueOnDate } from '@/lib/spacing/engine';

export function buildDateRibbonMarks(
  bundles: NoteBundle[],
  getSchedule: (id: string) => ReviewSchedule | undefined,
  firstLaunchDate: string
): DateRibbonMark[] {
  const marks: DateRibbonMark[] = [];

  for (const d of buildRibbonDays(firstLaunchDate)) {
    const date = format(d, 'yyyy-MM-dd');
    const due = bundles.filter((b) => {
      const s = getSchedule(b.review.reviewScheduleId);
      return s ? isDueOnDate(b, s, d) : false;
    });
    let status: DateRibbonMark['status'] = 'none';
    if (due.length > 0) {
      const todayKey = format(new Date(), 'yyyy-MM-dd');
      status = date < todayKey ? 'overdue' : date === todayKey ? 'upcoming' : 'upcoming';
      const allReviewed = due.every((b) => {
        const s = getSchedule(b.review.reviewScheduleId);
        if (!s) return true;
        const next = format(getNextReviewDate(b, s, d), 'yyyy-MM-dd');
        return next > date;
      });
      if (due.length > 0 && date < todayKey) status = 'overdue';
      else if (allReviewed && date <= todayKey) status = 'complete';
      else if (due.length > 0) status = 'upcoming';
    }
    marks.push({ date, status, bundleCount: due.length });
  }
  return marks;
}

export function getDueBundlesForDate(
  data: AppData,
  date: string,
  getSchedule: (id: string) => ReviewSchedule | undefined
): NoteBundle[] {
  const d = startOfDay(new Date(date + 'T12:00:00'));
  return data.bundles.filter((b) => {
    if (b.archived) return false;
    const s = getSchedule(b.review.reviewScheduleId);
    return s ? isDueOnDate(b, s, d) : false;
  });
}
