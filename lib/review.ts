import { addDays, format, isAfter, isBefore, isEqual, parseISO, startOfDay } from 'date-fns';

import type { ReviewSchedule, StudyItem } from './types';

function dayStart(d: Date | string): Date {
  return startOfDay(typeof d === 'string' ? parseISO(d) : d);
}

function toDateKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function getScheduleIntervals(schedule: ReviewSchedule): number[] {
  if (schedule.mode === 'everyNDays' && schedule.everyNDays) {
    return [schedule.everyNDays];
  }
  return schedule.customIntervals ?? [1, 3, 5, 7];
}

/** 다음 복습 예정일 (오늘 포함 이전이면 오늘 복습 대상) */
export function getNextReviewDate(item: StudyItem, schedule: ReviewSchedule, from = new Date()): Date {
  const anchor = dayStart(item.reviewAnchorDate);
  const today = dayStart(from);
  const intervals = getScheduleIntervals(schedule);

  if (schedule.mode === 'everyNDays' && schedule.everyNDays) {
    const n = schedule.everyNDays;
    let candidate = anchor;
    while (isBefore(candidate, today)) {
      candidate = addDays(candidate, n);
    }
    return candidate;
  }

  let step = item.reviewStepIndex;
  let next = anchor;
  if (step === 0) {
    next = addDays(anchor, intervals[0] ?? 1);
  } else {
    const last = item.lastReviewedAt ? dayStart(item.lastReviewedAt) : anchor;
    const gap = intervals[Math.min(step, intervals.length - 1)] ?? intervals[intervals.length - 1];
    next = addDays(last, gap);
  }

  while (isBefore(next, today)) {
    step += 1;
    const gap = intervals[Math.min(step, intervals.length - 1)] ?? intervals[intervals.length - 1];
    const base = item.lastReviewedAt ? dayStart(item.lastReviewedAt) : anchor;
    next = addDays(base, gap);
  }

  return next;
}

export function isDueToday(item: StudyItem, schedule: ReviewSchedule, today = new Date()): boolean {
  if (item.archived) return false;
  const next = getNextReviewDate(item, schedule, today);
  const t = dayStart(today);
  return isEqual(next, t) || isBefore(next, t);
}

export function getUpcomingReviewDates(
  item: StudyItem,
  schedule: ReviewSchedule,
  count = 6,
  from = new Date()
): string[] {
  const dates: string[] = [];
  let mock: StudyItem = { ...item };
  const today = dayStart(from);

  for (let i = 0; i < count + 5 && dates.length < count; i++) {
    const next = getNextReviewDate(mock, schedule, today);
    const key = toDateKey(next);
    if (!dates.includes(key)) dates.push(key);
    mock = {
      ...mock,
      lastReviewedAt: key,
      reviewStepIndex: mock.reviewStepIndex + 1,
      reviewAnchorDate: mock.reviewAnchorDate,
    };
    if (dates.length >= count) break;
  }
  return dates.slice(0, count);
}

export function advanceAfterReview(item: StudyItem): StudyItem {
  return {
    ...item,
    lastReviewedAt: toDateKey(new Date()),
    reviewStepIndex: item.reviewStepIndex + 1,
  };
}

export function resetReviewFromToday(item: StudyItem): StudyItem {
  return {
    ...item,
    reviewAnchorDate: toDateKey(new Date()),
    reviewStepIndex: 0,
    lastReviewedAt: null,
  };
}

export function keepOriginalReviewCycle(item: StudyItem): StudyItem {
  return item;
}
