import {
  buildLocalCloudAsset,
  persistOriginalCopy,
  persistSourceCopy,
} from '@/services/storage/asset-pipeline';
import type { StorageProvider } from '@/services/storage/types';
import type { CloudAsset, NotePage } from '@/lib/domain/types';
import { getFullImageUri } from '@/lib/files/display-image-uri';
import { uriIsReadable } from '@/lib/files/asset-uri-utils';

import { attachAnswerToPage } from '@/lib/domain/attach-answer';

async function ensureUncroppedUri(
  asset: CloudAsset,
  bundleId: string,
  storageKey: string
): Promise<string | null> {
  if (asset.uncroppedLocalUri && (await uriIsReadable(asset.uncroppedLocalUri))) {
    return asset.uncroppedLocalUri;
  }
  const prevMaster = getFullImageUri(asset);
  if (!prevMaster || !(await uriIsReadable(prevMaster))) return null;
  return persistSourceCopy(prevMaster, bundleId, storageKey);
}

export async function replacePageFrontPhoto(
  storage: StorageProvider,
  page: NotePage,
  bundleId: string,
  imageUri: string
): Promise<NotePage> {
  const uncroppedLocalUri = await ensureUncroppedUri(page.asset, bundleId, page.id);
  const master = await persistOriginalCopy(imageUri, bundleId, page.id);
  const thumb = await storage.createThumbnail(master, bundleId, page.id);
  const now = new Date().toISOString();
  return {
    ...page,
    asset: {
      ...buildLocalCloudAsset(master, thumb, 'pending_upload'),
      uncroppedLocalUri,
    },
    updatedAt: now,
  };
}

export async function replacePageAnswerPhoto(
  storage: StorageProvider,
  page: NotePage,
  bundleId: string,
  imageUri: string
): Promise<NotePage> {
  const ansKey = `${page.id}_back`;
  const prevAnswer = page.answerAsset;
  const uncroppedLocalUri = prevAnswer
    ? await ensureUncroppedUri(prevAnswer, bundleId, ansKey)
    : null;
  const updated = await attachAnswerToPage(storage, page, bundleId, imageUri);
  if (!updated.answerAsset) return updated;
  return {
    ...updated,
    answerAsset: {
      ...updated.answerAsset,
      uncroppedLocalUri,
    },
  };
}
