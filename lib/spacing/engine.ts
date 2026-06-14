import {
  addDays,
  differenceInCalendarDays,
  format,
  isAfter,
  isBefore,
  isEqual,
  parseISO,
  startOfDay,
} from 'date-fns';

import type { NoteBundle, ReviewSchedule } from '@/lib/domain/types';

function dayStart(d: Date | string): Date {
  return startOfDay(typeof d === 'string' ? parseISO(d) : d);
}

function toKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function getScheduleIntervals(schedule: ReviewSchedule): number[] {
  if (schedule.mode === 'everyNDays' && schedule.everyNDays) {
    return [schedule.everyNDays];
  }
  return schedule.customIntervals ?? [1, 3, 7, 14, 30];
}

/**
 * Cumulative day numbers from the anchor (save date).
 * e.g. [1, 3, 7, 14, 30] → save day, +2d, +6d, +13d, +29d; then +30d cycles.
 */
export function scheduledReviewDate(
  anchor: Date,
  stepIndex: number,
  intervals: number[]
): Date {
  if (intervals.length === 0) return anchor;

  if (stepIndex < intervals.length) {
    const dayNumber = intervals[stepIndex] ?? 1;
    return addDays(anchor, Math.max(0, dayNumber - 1));
  }

  const lastInterval = intervals[intervals.length - 1] ?? 30;
  const lastMilestoneOffset = Math.max(0, lastInterval - 1);
  const overflowSteps = stepIndex - intervals.length + 1;
  return addDays(anchor, lastMilestoneOffset + lastInterval * overflowSteps);
}

function pendingReviewDate(
  bundle: NoteBundle,
  schedule: ReviewSchedule
): Date {
  const anchor = dayStart(bundle.review.reviewAnchorDate);
  const step = bundle.review.reviewStepIndex;

  if (schedule.mode === 'everyNDays' && schedule.everyNDays) {
    const stepDays = Math.max(1, schedule.everyNDays);
    return addDays(anchor, step * stepDays);
  }

  return scheduledReviewDate(anchor, step, getScheduleIntervals(schedule));
}

/** Scheduled date for the current review step (may be overdue). */
export function getNextReviewDate(
  bundle: NoteBundle,
  schedule: ReviewSchedule,
  _from = new Date()
): Date {
  if (bundle.archived) {
    return addDays(dayStart(_from), 36500);
  }
  return pendingReviewDate(bundle, schedule);
}

export function isDueOnDate(
  bundle: NoteBundle,
  schedule: ReviewSchedule,
  date = new Date()
): boolean {
  if (bundle.archived) return false;
  const pending = pendingReviewDate(bundle, schedule);
  const t = dayStart(date);
  return isEqual(pending, t) || isBefore(pending, t);
}

/** Whether a review is scheduled on this exact day (current step onward). */
export function isReviewOnDate(
  bundle: NoteBundle,
  schedule: ReviewSchedule,
  date: Date
): boolean {
  if (bundle.archived) return false;

  const anchor = dayStart(bundle.review.reviewAnchorDate);
  const t = dayStart(date);

  if (isBefore(t, anchor)) return false;

  if (schedule.mode === 'everyNDays' && schedule.everyNDays) {
    const stepDays = Math.max(1, schedule.everyNDays);
    const diff = differenceInCalendarDays(t, anchor);
    if (diff < 0 || diff % stepDays !== 0) return false;
    const step = diff / stepDays;
    return step >= bundle.review.reviewStepIndex;
  }

  const intervals = getScheduleIntervals(schedule);
  for (let step = bundle.review.reviewStepIndex, guard = 0; guard < 200; step += 1, guard += 1) {
    const scheduled = scheduledReviewDate(anchor, step, intervals);
    if (isEqual(scheduled, t)) return true;
    if (isAfter(scheduled, t)) return false;
  }

  return false;
}

export function isDueToday(bundle: NoteBundle, schedule: ReviewSchedule): boolean {
  return isDueOnDate(bundle, schedule, new Date());
}

export function advanceAfterReview(bundle: NoteBundle): NoteBundle {
  const today = toKey(new Date());
  return {
    ...bundle,
    review: {
      ...bundle.review,
      lastReviewedAt: today,
      reviewStepIndex: bundle.review.reviewStepIndex + 1,
      nextReviewAt: null,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function resetReviewCycle(bundle: NoteBundle): NoteBundle {
  const today = toKey(new Date());
  return {
    ...bundle,
    review: {
      ...bundle.review,
      reviewAnchorDate: today,
      reviewStepIndex: 0,
      lastReviewedAt: null,
      nextReviewAt: null,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function maintainReviewCycle(bundle: NoteBundle): NoteBundle {
  return { ...bundle, updatedAt: new Date().toISOString() };
}

export function getUpcomingReviewDates(
  bundle: NoteBundle,
  schedule: ReviewSchedule,
  count = 8,
  from = new Date()
): string[] {
  if (bundle.archived) return [];

  const anchor = dayStart(bundle.review.reviewAnchorDate);
  const today = dayStart(from);
  const dates: string[] = [];
  let step = bundle.review.reviewStepIndex;

  if (schedule.mode === 'everyNDays' && schedule.everyNDays) {
    const stepDays = Math.max(1, schedule.everyNDays);
    for (let guard = 0; dates.length < count && guard < 200; guard += 1, step += 1) {
      const scheduled = addDays(anchor, step * stepDays);
      if (!isBefore(scheduled, today)) {
        const key = toKey(scheduled);
        if (!dates.includes(key)) dates.push(key);
      }
    }
    return dates.slice(0, count);
  }

  const intervals = getScheduleIntervals(schedule);
  for (let guard = 0; dates.length < count && guard < 200; guard += 1, step += 1) {
    const scheduled = scheduledReviewDate(anchor, step, intervals);
    if (!isBefore(scheduled, today)) {
      const key = toKey(scheduled);
      if (!dates.includes(key)) dates.push(key);
    }
  }

  return dates.slice(0, count);
}

export function listDueBundles(
  bundles: NoteBundle[],
  getSchedule: (id: string) => ReviewSchedule | undefined,
  date = new Date()
): NoteBundle[] {
  return bundles.filter((b) => {
    if (b.archived) return false;
    const s = getSchedule(b.review.reviewScheduleId);
    return s ? isDueOnDate(b, s, date) : false;
  });
}
