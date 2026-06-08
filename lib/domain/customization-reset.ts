import { collectAllCaptureTags } from '@/lib/domain/capture-tags';
import { SCHEDULE_EVERY_TWO_DAYS_ID } from '@/lib/domain/folder-schedule';
import type { AppData } from '@/lib/domain/types';
import { ensureTagColorMap } from '@/lib/ui/tag-colors';

/** yyyy-MM from a local calendar date key. */
export function customizationMonthKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

/**
 * Free tier: tag colors and subject review schedules reset at each calendar month
 * (not weekly). Pro keeps custom choices.
 */
export function applyMonthlyCustomizationReset(
  data: AppData,
  localToday: string
): AppData | null {
  if (data.settings.tier === 'pro') return null;

  const month = customizationMonthKey(localToday);
  if (data.settings.customizationResetMonth === month) return null;

  const activeTags = collectAllCaptureTags(data.settings.captureTagPresets, data.bundles);
  return {
    ...data,
    subjects: data.subjects.map((s) => ({
      ...s,
      reviewScheduleId: SCHEDULE_EVERY_TWO_DAYS_ID,
    })),
    settings: {
      ...data.settings,
      tagColors: ensureTagColorMap(activeTags, {}),
      customizationResetMonth: month,
    },
  };
}
