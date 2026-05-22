import { addDays, format, isBefore, isEqual, parseISO, startOfDay } from 'date-fns';

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
  return schedule.customIntervals ?? [1, 3, 5, 7, 14];
}

export function getNextReviewDate(
  bundle: NoteBundle,
  schedule: ReviewSchedule,
  from = new Date()
): Date {
  const anchor = dayStart(bundle.review.reviewAnchorDate);
  const today = dayStart(from);
  const intervals = getScheduleIntervals(schedule);

  if (schedule.mode === 'everyNDays' && schedule.everyNDays) {
    let candidate = anchor;
    while (isBefore(candidate, today)) {
      candidate = addDays(candidate, schedule.everyNDays);
    }
    return candidate;
  }

  let step = bundle.review.reviewStepIndex;
  let next = anchor;
  if (step === 0) {
    next = addDays(anchor, intervals[0] ?? 1);
  } else {
    const last = bundle.review.lastReviewedAt
      ? dayStart(bundle.review.lastReviewedAt)
      : anchor;
    const gap = intervals[Math.min(step, intervals.length - 1)] ?? intervals[intervals.length - 1];
    next = addDays(last, gap);
  }

  while (isBefore(next, today)) {
    step += 1;
    const gap = intervals[Math.min(step, intervals.length - 1)] ?? intervals[intervals.length - 1];
    const base = bundle.review.lastReviewedAt
      ? dayStart(bundle.review.lastReviewedAt)
      : anchor;
    next = addDays(base, gap);
  }

  return next;
}

export function isDueOnDate(
  bundle: NoteBundle,
  schedule: ReviewSchedule,
  date = new Date()
): boolean {
  if (bundle.archived) return false;
  const next = getNextReviewDate(bundle, schedule, date);
  const t = dayStart(date);
  return isEqual(next, t) || isBefore(next, t);
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
  const dates: string[] = [];
  let mock: NoteBundle = { ...bundle };
  const today = dayStart(from);

  for (let i = 0; i < count + 8 && dates.length < count; i++) {
    const next = getNextReviewDate(mock, schedule, today);
    const key = toKey(next);
    if (!dates.includes(key)) dates.push(key);
    mock = advanceAfterReview(mock);
  }

  return dates.slice(0, count);
}

export function listDueBundles(
  bundles: NoteBundle[],
  getSchedule: (id: string) => ReviewSchedule | undefined,
  date = new Date()
): NoteBundle[] {
  return bundles.filter((b) => {
    const s = getSchedule(b.review.reviewScheduleId);
    return s ? isDueOnDate(b, s, date) : false;
  });
}
