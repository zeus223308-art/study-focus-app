import type { AppData, NoteBundle } from './types';

/** Move a photo stack (bundle) to another subject folder; merges same-date stacks when needed. */
export function moveBundleToSubject(
  data: AppData,
  bundleId: string,
  targetSubjectId: string
): AppData {
  const source = data.bundles.find((b) => b.id === bundleId && !b.archived);
  if (!source || source.subjectId === targetSubjectId) return data;

  const targetSubject = data.subjects.find((s) => s.id === targetSubjectId);
  const scheduleId = targetSubject?.reviewScheduleId ?? source.review.reviewScheduleId;

  const moved: NoteBundle = {
    ...source,
    subjectId: targetSubjectId,
    review: { ...source.review, reviewScheduleId: scheduleId },
    updatedAt: new Date().toISOString(),
  };

  return {
    ...data,
    bundles: data.bundles.map((b) => (b.id === bundleId ? moved : b)),
  };
}
