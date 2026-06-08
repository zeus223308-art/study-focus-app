import { buildLocalCloudAsset, persistOriginalCopy } from '@/services/storage/asset-pipeline';
import type { StorageProvider } from '@/services/storage/types';
import type { NotePage } from '@/lib/domain/types';
import { ensureUncroppedSourceUri } from '@/lib/files/preserve-uncropped-source';

export async function replacePageFrontPhoto(
  storage: StorageProvider,
  page: NotePage,
  bundleId: string,
  imageUri: string
): Promise<NotePage> {
  const uncroppedLocalUri =
    page.asset.uncroppedLocalUri ??
    (await ensureUncroppedSourceUri(page.asset, bundleId, page.id));
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

import { attachAnswerToPage } from '@/lib/domain/attach-answer';

export async function replacePageAnswerPhoto(
  storage: StorageProvider,
  page: NotePage,
  bundleId: string,
  imageUri: string
): Promise<NotePage> {
  return attachAnswerToPage(storage, page, bundleId, imageUri);
}
