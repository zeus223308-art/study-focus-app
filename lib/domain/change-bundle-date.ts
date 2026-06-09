import { todayKey, studyDateBounds } from '@/lib/domain/dates';
import { newReviewState } from '@/lib/domain/bundle-factory';
import type { AppData } from '@/lib/domain/types';

function clampStudyDate(studyDate: string, firstLaunchDate: string): string {
  const { min, max } = studyDateBounds(firstLaunchDate);
  if (studyDate < min) return min;
  if (studyDate > max) return max;
  return studyDate;
}

/** Move a bundle (and its pages/layers) to another study date; resets review anchor to that day. */
export function changeBundleStudyDateInData(
  data: AppData,
  bundleId: string,
  newStudyDate: string
): AppData | null {
  const bundle = data.bundles.find((b) => b.id === bundleId);
  if (!bundle) return null;

  const firstLaunch = data.settings.firstLaunchDate ?? todayKey();
  const studyDate = clampStudyDate(newStudyDate, firstLaunch);
  if (studyDate === bundle.studyDate) return data;

  const scheduleId =
    bundle.review.reviewScheduleId ?? data.schedules[0]?.id ?? 'sched_135714';
  const now = new Date().toISOString();

  const updated = {
    ...bundle,
    studyDate,
    pages: bundle.pages.map((page) => ({
      ...page,
      studyDate,
      layers: page.layers.map((layer) => ({ ...layer, studyDate })),
      updatedAt: now,
    })),
    review: newReviewState(scheduleId, studyDate),
    updatedAt: now,
  };

  return {
    ...data,
    bundles: data.bundles.map((b) => (b.id === bundleId ? updated : b)),
  };
}
