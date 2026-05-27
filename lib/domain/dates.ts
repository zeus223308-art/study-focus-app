import { addDays, format, parseISO, startOfDay } from 'date-fns';

import type { AppData, AppSettings } from './types';

/** Local calendar date for this device (uses phone timezone, not UTC). */
export function todayKey(): string {
  return format(startOfDay(new Date()), 'yyyy-MM-dd');
}

/** Infer install anchor for users upgrading without firstLaunchDate saved */
export function inferFirstLaunchDate(data: AppData): string {
  if (data.settings.firstLaunchDate) {
    return data.settings.firstLaunchDate;
  }

  let earliest = todayKey();

  for (const bundle of data.bundles) {
    if (bundle.studyDate < earliest) earliest = bundle.studyDate;
    if (bundle.createdAt) {
      const d = format(startOfDay(parseISO(bundle.createdAt)), 'yyyy-MM-dd');
      if (d < earliest) earliest = d;
    }
  }

  for (const subject of data.subjects) {
    const d = format(startOfDay(parseISO(subject.createdAt)), 'yyyy-MM-dd');
    if (d < earliest) earliest = d;
  }

  return earliest;
}

export function normalizeAppSettings(settings: AppSettings, data: AppData): AppSettings {
  const merged = { ...data.settings, ...settings };
  const firstLaunchDate = merged.firstLaunchDate ?? inferFirstLaunchDate({ ...data, settings: merged });
  const pageCount = data.bundles.reduce((n, b) => n + b.pages.length, 0);
  return {
    ...merged,
    firstLaunchDate,
    hadStudyContent: pageCount > 0 || Boolean(merged.hadStudyContent),
    lastSavedPageCount: pageCount,
    lastSavedAt: merged.lastSavedAt ?? null,
    lastAppVersion: merged.lastAppVersion ?? null,
    lastAutoRecoveryAt: merged.lastAutoRecoveryAt ?? null,
    cloudAccountEmail: merged.cloudAccountEmail ?? null,
    lastDerivativeRegenFailed: merged.lastDerivativeRegenFailed ?? 0,
    lastDerivativeRegenAt: merged.lastDerivativeRegenAt ?? null,
    captureFrameAspect: merged.captureFrameAspect ?? '4:3',
  };
}

/** Inclusive range from first app day through today (local). No future days. */
export function buildRibbonDays(firstLaunchDate: string): Date[] {
  const start = startOfDay(parseISO(`${firstLaunchDate}T12:00:00`));
  const end = startOfDay(new Date());
  const from = start > end ? end : start;
  const days: Date[] = [];
  for (let cursor = from; cursor <= end; cursor = addDays(cursor, 1)) {
    days.push(cursor);
  }
  return days;
}

export function ribbonDayCount(firstLaunchDate: string): number {
  return buildRibbonDays(firstLaunchDate).length;
}

export function studyDateBounds(firstLaunchDate: string): { min: string; max: string } {
  return { min: firstLaunchDate, max: todayKey() };
}

/** Move study date by N days, clamped to first-launch…today (no future). */
export function shiftStudyDateKey(
  studyDate: string,
  deltaDays: number,
  bounds: { min: string; max: string }
): string {
  const shifted = format(
    startOfDay(addDays(parseISO(`${studyDate}T12:00:00`), deltaDays)),
    'yyyy-MM-dd'
  );
  if (shifted < bounds.min) return bounds.min;
  if (shifted > bounds.max) return bounds.max;
  return shifted;
}
