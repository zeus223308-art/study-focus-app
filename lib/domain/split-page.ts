import { format, startOfDay } from 'date-fns';

import { mergeItemOrder } from '@/lib/domain/reorder';
import { removePageFromData } from '@/lib/domain/remove-page';
import { newReviewState } from '@/lib/domain/bundle-factory';
import type { AppData, NoteBundle } from '@/lib/domain/types';

/** Move one page into a new bundle (same or another subject folder). */
export function splitPageToNewBundle(
  data: AppData,
  bundleId: string,
  pageId: string,
  title: string,
  targetSubjectId: string
): AppData {
  const source = data.bundles.find((b) => b.id === bundleId && !b.archived);
  if (!source) return data;

  const page = source.pages.find((p) => p.id === pageId);
  if (!page) return data;

  const subject = data.subjects.find((s) => s.id === targetSubjectId);
  if (!subject) return data;

  const { data: withoutPage } = removePageFromData(data, bundleId, pageId);
  const studyDate = page.studyDate || source.studyDate || format(startOfDay(new Date()), 'yyyy-MM-dd');
  const now = new Date().toISOString();
  const newBundleId = `bundle_${targetSubjectId}_${studyDate}_${Date.now()}`;
  const newPage = {
    ...page,
    bundleId: newBundleId,
    sortIndex: 0,
    updatedAt: now,
  };

  const newBundle: NoteBundle = {
    id: newBundleId,
    subjectId: targetSubjectId,
    studyDate,
    title: title.trim(),
    pageIds: [newPage.id],
    pages: [newPage],
    archived: false,
    archivedAt: null,
    review: newReviewState(subject.reviewScheduleId, studyDate),
    createdAt: now,
    updatedAt: now,
  };

  const itemKey = `${newBundleId}:${newPage.id}`;
  const subjects = withoutPage.subjects.map((s) => {
    if (s.id !== targetSubjectId) return s;
    const order = mergeItemOrder(s.itemOrder, [itemKey]);
    return { ...s, itemOrder: order };
  });

  return {
    ...withoutPage,
    subjects,
    bundles: [newBundle, ...withoutPage.bundles],
  };
}
