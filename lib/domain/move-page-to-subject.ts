import { newReviewState } from '@/lib/domain/bundle-factory';
import { moveBundleToSubject } from '@/lib/domain/move-bundle';
import { removePageFromData } from '@/lib/domain/remove-page';
import type { AppData, NoteBundle, NotePage } from '@/lib/domain/types';

function extractPageToNewBundle(
  page: NotePage,
  targetSubjectId: string,
  scheduleId: string
): NoteBundle {
  const studyDate = page.studyDate;
  const bundleId = `bundle_${targetSubjectId}_${studyDate}_${Date.now()}`;
  const now = new Date().toISOString();
  const newPage: NotePage = {
    ...page,
    id: `page_${Date.now()}_mv`,
    bundleId,
    sortIndex: 0,
    updatedAt: now,
  };

  return {
    id: bundleId,
    subjectId: targetSubjectId,
    studyDate,
    title: '',
    pageIds: [newPage.id],
    pages: [newPage],
    archived: false,
    archivedAt: null,
    review: newReviewState(scheduleId, studyDate),
    createdAt: now,
    updatedAt: now,
  };
}

/** Move one problem (page) into another subject — splits multi-page bundles when needed. */
export function movePageToSubject(
  data: AppData,
  bundleId: string,
  pageId: string,
  targetSubjectId: string
): AppData | null {
  const bundle = data.bundles.find((b) => b.id === bundleId && !b.archived);
  if (!bundle) return null;
  const page = bundle.pages.find((p) => p.id === pageId);
  if (!page) return null;

  const targetSubject = data.subjects.find((s) => s.id === targetSubjectId);
  if (!targetSubject || bundle.subjectId === targetSubjectId) return null;

  const itemKey = `${bundleId}:${pageId}`;

  if (bundle.pages.length === 1) {
    const moved = moveBundleToSubject(data, bundleId, targetSubjectId);
    return patchSubjectItemOrders(moved, bundle.subjectId, targetSubjectId, itemKey, null);
  }

  const { data: afterRemove } = removePageFromData(data, bundleId, pageId);
  const newBundle = extractPageToNewBundle(page, targetSubjectId, targetSubject.reviewScheduleId);
  const newKey = `${newBundle.id}:${newBundle.pages[0]!.id}`;

  return patchSubjectItemOrders(
    { ...afterRemove, bundles: [...afterRemove.bundles, newBundle] },
    bundle.subjectId,
    targetSubjectId,
    itemKey,
    newKey
  );
}

function patchSubjectItemOrders(
  data: AppData,
  sourceSubjectId: string,
  targetSubjectId: string,
  removedKey: string,
  addedKey: string | null
): AppData {
  return {
    ...data,
    subjects: data.subjects.map((s) => {
      if (s.id === sourceSubjectId && s.itemOrder?.length) {
        return { ...s, itemOrder: s.itemOrder.filter((k) => k !== removedKey) };
      }
      if (s.id === targetSubjectId && addedKey) {
        const order = s.itemOrder ? [...s.itemOrder, addedKey] : [addedKey];
        return { ...s, itemOrder: order };
      }
      return s;
    }),
  };
}
