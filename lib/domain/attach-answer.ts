import { extractOcrFromImageUri } from '@/lib/review/ocr-extract';
import { buildLocalCloudAsset, persistOriginalCopy } from '@/services/storage/asset-pipeline';
import type { StorageProvider } from '@/services/storage/types';
import { ensureUncroppedSourceUri } from '@/lib/files/preserve-uncropped-source';

import type { NotePage } from './types';

export async function attachAnswerToPage(
  storage: StorageProvider,
  page: NotePage,
  bundleId: string,
  answerImageUri: string
): Promise<NotePage> {
  const ansKey = `${page.id}_back`;
  const prior = page.answerAsset;
  const uncroppedLocalUri =
    prior?.uncroppedLocalUri ??
    (prior ? await ensureUncroppedSourceUri(prior, bundleId, ansKey) : null);
  const ansMaster = await persistOriginalCopy(answerImageUri, bundleId, ansKey);
  const ansThumb = await storage.createThumbnail(ansMaster, bundleId, ansKey);
  const answerOcrText = await extractOcrFromImageUri(ansMaster);
  const now = new Date().toISOString();

  return {
    ...page,
    answerAsset: {
      ...buildLocalCloudAsset(ansMaster, ansThumb, 'pending_upload'),
      uncroppedLocalUri,
    },
    answerOcrText,
    updatedAt: now,
  };
}
