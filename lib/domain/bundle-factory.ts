import { todayKey, studyDateBounds } from '@/lib/domain/dates';
import { normalizeFolderScheduleId } from '@/lib/domain/folder-schedule';
import type { AppData, NoteBundle, NotePage, ReviewCycleState } from './types';
import { extractOcrFromImageUri } from '@/lib/review/ocr-extract';
import { buildLocalCloudAsset, createMiniThumbnail, persistOriginalCopy } from '@/services/storage/asset-pipeline';
import type { StorageProvider, ThumbnailResult } from '@/services/storage/types';

function clampStudyDate(studyDate: string, firstLaunchDate: string): string {
  const { min, max } = studyDateBounds(firstLaunchDate);
  if (studyDate < min) return min;
  if (studyDate > max) return max;
  return studyDate;
}

function resolveScheduleId(data: AppData, subject: AppData['subjects'][number]): string {
  const normalized = normalizeFolderScheduleId(subject.reviewScheduleId || '');
  if (normalized) return normalized;
  return data.schedules.find((s) => s.tier === 'standard')?.id ?? data.schedules[0]?.id ?? 'sched_135714';
}

function fallbackThumb(sourceUri: string): ThumbnailResult {
  return {
    thumbnailUri: sourceUri,
    localMiniUri: sourceUri,
    width: 0,
    height: 0,
  };
}

export async function createPageFromCapture(
  storage: StorageProvider,
  params: {
    imageUri: string;
    answerImageUri?: string | null;
    subjectId: string;
    studyDate: string;
    scheduleId: string;
    bundleId: string;
    sortIndex: number;
    tags?: string[];
  }
): Promise<NotePage> {
  const pageId = `page_${Date.now()}_${params.sortIndex}_${Math.random().toString(36).slice(2, 9)}`;
  let masterUri = params.imageUri;
  try {
    masterUri = await persistOriginalCopy(params.imageUri, params.bundleId, pageId);
  } catch {
    masterUri = params.imageUri;
  }

  let thumb: ThumbnailResult;
  try {
    thumb = await storage.createThumbnail(masterUri, params.bundleId, pageId);
  } catch {
    thumb = fallbackThumb(masterUri);
  }

  const now = new Date().toISOString();

  let answerAsset: NotePage['answerAsset'] = null;
  let answerOcrText = '';
  let ansMaster = '';
  if (params.answerImageUri) {
    const ansKey = `${pageId}_back`;
    ansMaster = await persistOriginalCopy(params.answerImageUri, params.bundleId, ansKey);
    const ansThumb = await storage.createThumbnail(ansMaster, params.bundleId, ansKey);
    answerAsset = buildLocalCloudAsset(ansMaster, ansThumb, 'pending_upload');
  }

  const ocrText = await extractOcrFromImageUri(masterUri);
  if (ansMaster) {
    answerOcrText = await extractOcrFromImageUri(ansMaster);
  }

  return {
    id: pageId,
    bundleId: params.bundleId,
    sortIndex: params.sortIndex,
    studyDate: params.studyDate,
    textNote: '',
    tags: params.tags ?? [],
    asset: buildLocalCloudAsset(masterUri, thumb, 'pending_upload'),
    answerAsset,
    answerOcrText,
    layers: [],
    ocrText,
    slideshowSeconds: 10,
    answerSlideshowSeconds: 10,
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

export async function appendPageToBundle(
  storage: StorageProvider,
  data: AppData,
  bundleId: string,
  params: { imageUri: string; answerImageUri?: string | null }
): Promise<{ data: AppData; bundleId: string } | null> {
  const existing = data.bundles.find((b) => b.id === bundleId && !b.archived);
  if (!existing) return null;

  const subject = data.subjects.find((s) => s.id === existing.subjectId);
  const scheduleId = subject?.reviewScheduleId ?? data.schedules[0].id;

  const page = await createPageFromCapture(storage, {
    imageUri: params.imageUri,
    answerImageUri: params.answerImageUri,
    subjectId: existing.subjectId,
    studyDate: existing.studyDate,
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

export async function appendCaptureToData(
  storage: StorageProvider,
  data: AppData,
  params: {
    imageUri: string;
    answerImageUri?: string | null;
    subjectId: string;
    studyDate?: string;
    tags?: string[];
  }
): Promise<{ data: AppData; bundleId: string }> {
  const firstLaunch = data.settings.firstLaunchDate ?? todayKey();
  const studyDate = clampStudyDate(
    params.studyDate ?? todayKey(),
    firstLaunch
  );
  const subject = data.subjects.find((s) => s.id === params.subjectId);
  if (!subject) {
    throw new Error(`appendCaptureToData: unknown subject ${params.subjectId}`);
  }
  const scheduleId = resolveScheduleId(data, subject);

  /** One capture/import = one problem card (new bundle), not merged into same-day stack. */
  const bundleId = `bundle_${params.subjectId}_${studyDate}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const page = await createPageFromCapture(storage, {
    imageUri: params.imageUri,
    answerImageUri: params.answerImageUri,
    subjectId: params.subjectId,
    studyDate,
    scheduleId,
    bundleId,
    sortIndex: 0,
    tags: params.tags,
  });
  const now = new Date().toISOString();
  const bundle: NoteBundle = {
    id: bundleId,
    subjectId: params.subjectId,
    studyDate,
    title: '',
    pageIds: [page.id],
    pages: [page],
    archived: false,
    archivedAt: null,
    review: newReviewState(scheduleId, studyDate),
    createdAt: now,
    updatedAt: now,
  };

  const itemKey = `${bundleId}:${page.id}`;
  const subjects = data.subjects.map((s) => {
    if (s.id !== params.subjectId) return s;
    if (s.itemOrder?.includes(itemKey)) return s;
    return { ...s, itemOrder: [...(s.itemOrder ?? []), itemKey] };
  });

  return {
    data: { ...data, subjects, bundles: [bundle, ...data.bundles] },
    bundleId,
  };
}
