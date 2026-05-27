import type { AppData, NotePage } from '@/lib/domain/types';
import { repairCloudAsset } from '@/lib/files/asset-uri-utils';

async function repairPage(page: NotePage): Promise<NotePage> {
  const asset = await repairCloudAsset(page.asset, page.bundleId, page.id, 'master');
  const answerAsset = page.answerAsset
    ? await repairCloudAsset(page.answerAsset, page.bundleId, `${page.id}_back`, 'back')
    : null;
  return { ...page, asset, answerAsset };
}

/** Fix stale blob: / broken msherpa pointers using canonical IndexedDB keys. */
export async function repairAppDataAssets(data: AppData): Promise<AppData> {
  const bundles = await Promise.all(
    data.bundles.map(async (b) => ({
      ...b,
      pages: await Promise.all(b.pages.map(repairPage)),
    }))
  );

  const trash = await Promise.all(
    data.trash.map(async (entry) => ({
      ...entry,
      bundleSnapshot: {
        ...entry.bundleSnapshot,
        pages: await Promise.all(entry.bundleSnapshot.pages.map(repairPage)),
      },
    }))
  );

  return { ...data, bundles, trash };
}
