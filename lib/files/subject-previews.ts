import type { AppData } from '@/lib/domain/types';

export type SubjectPreviewItem = {
  bundleId: string;
  pageId: string;
  studyDate: string;
  thumbnailUri: string;
};

/** Front (problem) images for a subject — newest study dates first. */
export function getSubjectFrontPreviews(data: AppData, subjectId: string): SubjectPreviewItem[] {
  const items: SubjectPreviewItem[] = [];

  const bundles = data.bundles
    .filter((b) => b.subjectId === subjectId && !b.archived)
    .sort((a, b) => b.studyDate.localeCompare(a.studyDate));

  for (const bundle of bundles) {
    for (const page of bundle.pages) {
      const thumbnailUri =
        page.asset.localMiniUri ?? page.asset.originalLocalUri ?? page.asset.thumbnailUri;
      if (!thumbnailUri) continue;
      items.push({
        bundleId: bundle.id,
        pageId: page.id,
        studyDate: bundle.studyDate,
        thumbnailUri,
      });
    }
  }

  return items;
}

/** Front images from specific bundles (e.g. today's due items per subject). */
export function getBundlesFrontPreviews(bundles: AppData['bundles']): SubjectPreviewItem[] {
  const items: SubjectPreviewItem[] = [];
  const sorted = [...bundles].sort((a, b) => b.studyDate.localeCompare(a.studyDate));

  for (const bundle of sorted) {
    if (bundle.archived) continue;
    for (const page of bundle.pages) {
      const thumbnailUri =
        page.asset.localMiniUri ?? page.asset.originalLocalUri ?? page.asset.thumbnailUri;
      if (!thumbnailUri) continue;
      items.push({
        bundleId: bundle.id,
        pageId: page.id,
        studyDate: bundle.studyDate,
        thumbnailUri,
      });
    }
  }

  return items;
}
