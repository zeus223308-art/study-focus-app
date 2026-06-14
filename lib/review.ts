import { addDays, differenceInCalendarDays, format, isAfter, isBefore, isEqual, parseISO, startOfDay } from 'date-fns';

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
  return schedule.customIntervals ?? [1, 3, 7, 14, 30];
}

function scheduledReviewDate(anchor: Date, stepIndex: number, intervals: number[]): Date {
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

function pendingReviewDate(item: StudyItem, schedule: ReviewSchedule): Date {
  const anchor = dayStart(item.reviewAnchorDate);
  const step = item.reviewStepIndex;

  if (schedule.mode === 'everyNDays' && schedule.everyNDays) {
    const stepDays = Math.max(1, schedule.everyNDays);
    return addDays(anchor, step * stepDays);
  }

  return scheduledReviewDate(anchor, step, getScheduleIntervals(schedule));
}

/** 다음 복습 예정일 (현재 단계 기준; 연체일 수 있음) */
export function getNextReviewDate(item: StudyItem, schedule: ReviewSchedule, _from = new Date()): Date {
  return pendingReviewDate(item, schedule);
}

export function isDueToday(item: StudyItem, schedule: ReviewSchedule, today = new Date()): boolean {
  if (item.archived) return false;
  const pending = pendingReviewDate(item, schedule);
  const t = dayStart(today);
  return isEqual(pending, t) || isBefore(pending, t);
}

export function getUpcomingReviewDates(
  item: StudyItem,
  schedule: ReviewSchedule,
  count = 6,
  from = new Date()
): string[] {
  const dates: string[] = [];
  const anchor = dayStart(item.reviewAnchorDate);
  const today = dayStart(from);
  let step = item.reviewStepIndex;

  if (schedule.mode === 'everyNDays' && schedule.everyNDays) {
    const stepDays = Math.max(1, schedule.everyNDays);
    for (let guard = 0; dates.length < count && guard < 200; guard += 1, step += 1) {
      const scheduled = addDays(anchor, step * stepDays);
      if (!isBefore(scheduled, today)) {
        const key = toDateKey(scheduled);
        if (!dates.includes(key)) dates.push(key);
      }
    }
    return dates.slice(0, count);
  }

  const intervals = getScheduleIntervals(schedule);
  for (let guard = 0; dates.length < count && guard < 200; guard += 1, step += 1) {
    const scheduled = scheduledReviewDate(anchor, step, intervals);
    if (!isBefore(scheduled, today)) {
      const key = toDateKey(scheduled);
      if (!dates.includes(key)) dates.push(key);
    }
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
