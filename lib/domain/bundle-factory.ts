import { format } from 'date-fns';

import type { AppData, NoteBundle, NotePage, ReviewCycleState } from './types';
import { buildLocalCloudAsset, createMiniThumbnail, persistOriginalCopy } from '@/services/storage/asset-pipeline';
import type { StorageProvider } from '@/services/storage/types';

export async function createPageFromCapture(
  storage: StorageProvider,
  params: {
    imageUri: string;
    subjectId: string;
    studyDate: string;
    scheduleId: string;
    bundleId: string;
    sortIndex: number;
  }
): Promise<NotePage> {
  const pageId = `page_${Date.now()}_${params.sortIndex}`;
  const masterUri = await persistOriginalCopy(params.imageUri, params.bundleId, pageId);
  const thumb = await storage.createThumbnail(masterUri, params.bundleId, pageId);
  const now = new Date().toISOString();

  return {
    id: pageId,
    bundleId: params.bundleId,
    sortIndex: params.sortIndex,
    studyDate: params.studyDate,
    textNote: '',
    tags: [],
    asset: buildLocalCloudAsset(masterUri, thumb, 'pending_upload'),
    answerAsset: null,
    layers: [],
    ocrText: '',
    slideshowSeconds: 10,
    createdAt: now,
    updatedAt: now,
  };
}

export function newReviewState(scheduleId: string, anchorDate: string): ReviewCycleState {
  return {
    reviewScheduleId: scheduleId,
    reviewAnchorDate: anchorDate,
    reviewStepIndex: 0,
    lastReviewedAt: null,
    nextReviewAt: null,
    aiScoreLast: null,
  };
}

export async function appendCaptureToData(
  storage: StorageProvider,
  data: AppData,
  params: { imageUri: string; subjectId: string; studyDate?: string }
): Promise<{ data: AppData; bundleId: string }> {
  const studyDate = params.studyDate ?? format(new Date(), 'yyyy-MM-dd');
  const subject = data.subjects.find((s) => s.id === params.subjectId);
  const scheduleId = subject?.reviewScheduleId ?? data.schedules[0].id;

  const existing = data.bundles.find(
    (b) => b.subjectId === params.subjectId && b.studyDate === studyDate && !b.archived
  );

  if (existing) {
    const page = await createPageFromCapture(storage, {
      imageUri: params.imageUri,
      subjectId: params.subjectId,
      studyDate,
      scheduleId,
      bundleId: existing.id,
      sortIndex: existing.pages.length,
    });
    const bundle: NoteBundle = {
      ...existing,
      pageIds: [...existing.pageIds, page.id],
      pages: [...existing.pages, page],
      updatedAt: new Date().toISOString(),
    };
    return {
      data: {
        ...data,
        bundles: data.bundles.map((b) => (b.id === bundle.id ? bundle : b)),
      },
      bundleId: bundle.id,
    };
  }

  const bundleId = `bundle_${params.subjectId}_${studyDate}_${Date.now()}`;
  const page = await createPageFromCapture(storage, {
    imageUri: params.imageUri,
    subjectId: params.subjectId,
    studyDate,
    scheduleId,
    bundleId,
    sortIndex: 0,
  });
  const now = new Date().toISOString();
  const bundle: NoteBundle = {
    id: bundleId,
    subjectId: params.subjectId,
    studyDate,
    title: studyDate,
    pageIds: [page.id],
    pages: [page],
    archived: false,
    archivedAt: null,
    review: newReviewState(scheduleId, studyDate),
    createdAt: now,
    updatedAt: now,
  };

  return {
    data: { ...data, bundles: [bundle, ...data.bundles] },
    bundleId,
  };
}
