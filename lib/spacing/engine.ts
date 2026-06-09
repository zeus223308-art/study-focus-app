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
  return schedule.customIntervals ?? [1, 3, 7, 14, 30];
}

export function getNextReviewDate(
  bundle: NoteBundle,
  schedule: ReviewSchedule,
  from = new Date()
): Date {
  if (bundle.archived) {
    return addDays(dayStart(from), 36500);
  }
  const anchor = dayStart(bundle.review.reviewAnchorDate);
  const today = dayStart(from);
  const intervals = getScheduleIntervals(schedule);

  const stepGap = (stepIndex: number) => {
    const gap =
      intervals[Math.min(stepIndex, intervals.length - 1)] ??
      intervals[intervals.length - 1] ??
      1;
    return Math.max(1, gap);
  };

  if (schedule.mode === 'everyNDays' && schedule.everyNDays) {
    const stepDays = Math.max(1, schedule.everyNDays);
    let candidate = anchor;
    let guard = 0;
    while (isBefore(candidate, today) && guard < 4000) {
      candidate = addDays(candidate, stepDays);
      guard += 1;
    }
    return guard >= 4000 ? today : candidate;
  }

  let step = bundle.review.reviewStepIndex;
  let next = anchor;
  if (step === 0) {
    next = addDays(anchor, stepGap(0));
  } else {
    const last = bundle.review.lastReviewedAt
      ? dayStart(bundle.review.lastReviewedAt)
      : anchor;
    next = addDays(last, stepGap(step));
  }

  let guard = 0;
  while (isBefore(next, today) && guard < 4000) {
    step += 1;
    next = addDays(next, stepGap(step));
    guard += 1;
  }

  return guard >= 4000 ? today : next;
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
  if (bundle.archived) return [];
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
    if (b.archived) return false;
    const s = getSchedule(b.review.reviewScheduleId);
    return s ? isDueOnDate(b, s, date) : false;
  });
}
