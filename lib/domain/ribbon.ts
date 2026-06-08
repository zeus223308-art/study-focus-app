import { format, startOfDay } from 'date-fns';

import { primaryCaptureTagForBundle } from '@/lib/domain/capture-tags';
import { resolveTagColorFor } from '@/lib/ui/tag-colors';
import { buildRibbonDays } from './dates';
import type { AppData, DateRibbonMark, NoteBundle, ReviewSchedule } from './types';
import { getNextReviewDate, isDueOnDate } from '@/lib/spacing/engine';

const MAX_TAG_DOTS_PER_DAY = 5;

/** One dot per tagged due photo — same tag/color rules as album thumbnails. */
export function buildDueTagDotColors(
  due: NoteBundle[],
  tagColors?: Record<string, string>,
  tagFallback?: string,
  max = MAX_TAG_DOTS_PER_DAY
): string[] {
  const colors: string[] = [];
  for (const bundle of due) {
    const tag = primaryCaptureTagForBundle(bundle);
    if (!tag) continue;
    colors.push(resolveTagColorFor(tag, tagColors, tagFallback));
    if (colors.length >= max) break;
  }
  return colors;
}

export function buildReviewMarkForDate(
  date: Date,
  bundles: NoteBundle[],
  getSchedule: (id: string) => ReviewSchedule | undefined,
  localToday: string,
  tagColors?: Record<string, string>,
  tagFallback?: string
): DateRibbonMark {
  const dateKey = format(date, 'yyyy-MM-dd');
  const due = bundles.filter((b) => {
    if (b.archived) return false;
    const s = getSchedule(b.review.reviewScheduleId);
    return s ? isDueOnDate(b, s, date) : false;
  });

  let status: DateRibbonMark['status'] = 'none';
  if (due.length > 0) {
    const allReviewed = due.every((b) => {
      const s = getSchedule(b.review.reviewScheduleId);
      if (!s) return true;
      const next = format(getNextReviewDate(b, s, date), 'yyyy-MM-dd');
      return next > dateKey;
    });
    if (dateKey < localToday) status = 'overdue';
    else if (allReviewed && dateKey <= localToday) status = 'complete';
    else status = 'upcoming';
  }

  const tagDots =
    due.length > 0 ? buildDueTagDotColors(due, tagColors, tagFallback) : [];

  return { date: dateKey, status, bundleCount: due.length, tagDots };
}

export function buildDateRibbonMarks(
  bundles: NoteBundle[],
  getSchedule: (id: string) => ReviewSchedule | undefined,
  firstLaunchDate: string,
  localToday = format(new Date(), 'yyyy-MM-dd'),
  tagColors?: Record<string, string>,
  tagFallback?: string
): DateRibbonMark[] {
  return buildRibbonDays(firstLaunchDate).map((d) =>
    buildReviewMarkForDate(d, bundles, getSchedule, localToday, tagColors, tagFallback)
  );
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
