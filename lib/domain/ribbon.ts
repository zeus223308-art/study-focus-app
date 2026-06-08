import { addDays, format, parseISO, startOfDay } from 'date-fns';

import { primaryCaptureTagForBundle } from '@/lib/domain/capture-tags';
import { resolveTagColorFor } from '@/lib/ui/tag-colors';
import { buildRibbonDays } from './dates';
import type { AppData, DateRibbonMark, NoteBundle, ReviewSchedule } from './types';
import { getNextReviewDate, getUpcomingReviewDates, isDueOnDate } from '@/lib/spacing/engine';

const MAX_TAG_DOTS_PER_DAY = 5;
const DEFAULT_FUTURE_HORIZON_DAYS = 120;

/** Last ribbon/calendar day: latest scheduled review or today + horizon padding. */
export function computeRibbonHorizon(
  bundles: NoteBundle[],
  getSchedule: (id: string) => ReviewSchedule | undefined,
  localToday: string,
  minFutureDays = DEFAULT_FUTURE_HORIZON_DAYS
): string {
  const today = startOfDay(parseISO(`${localToday}T12:00:00`));
  let maxKey = localToday;

  for (const bundle of bundles) {
    if (bundle.archived) continue;
    const schedule = getSchedule(bundle.review.reviewScheduleId);
    if (!schedule) continue;
    for (const key of getUpcomingReviewDates(bundle, schedule, 20, today)) {
      if (key > maxKey) maxKey = key;
    }
  }

  const minHorizon = format(addDays(today, minFutureDays), 'yyyy-MM-dd');
  return maxKey > minHorizon ? maxKey : minHorizon;
}

/** Past/today: due on or before the day; future: scheduled exactly on that day. */
export function isCalendarDueOnDate(
  bundle: NoteBundle,
  schedule: ReviewSchedule,
  date: Date,
  localToday: string
): boolean {
  const dateKey = format(date, 'yyyy-MM-dd');
  if (dateKey > localToday) {
    return format(getNextReviewDate(bundle, schedule, date), 'yyyy-MM-dd') === dateKey;
  }
  return isDueOnDate(bundle, schedule, date);
}

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
    return s ? isCalendarDueOnDate(b, s, date, localToday) : false;
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
  tagFallback?: string,
  horizonDate?: string
): DateRibbonMark[] {
  const end = horizonDate ?? localToday;
  return buildRibbonDays(firstLaunchDate, end).map((d) =>
    buildReviewMarkForDate(d, bundles, getSchedule, localToday, tagColors, tagFallback)
  );
}

export function getDueBundlesForDate(
  data: AppData,
  date: string,
  getSchedule: (id: string) => ReviewSchedule | undefined,
  localToday?: string
): NoteBundle[] {
  const today = localToday ?? format(startOfDay(new Date()), 'yyyy-MM-dd');
  const d = startOfDay(parseISO(`${date}T12:00:00`));
  return data.bundles.filter((b) => {
    if (b.archived) return false;
    const s = getSchedule(b.review.reviewScheduleId);
    return s ? isCalendarDueOnDate(b, s, d, today) : false;
  });
}
