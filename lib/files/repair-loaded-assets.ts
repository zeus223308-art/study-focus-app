import type { AppData, NotePage } from '@/lib/domain/types';
import {
  assetHasReadableImage,
  repairCloudAsset,
} from '@/lib/files/asset-uri-utils';
import { readLocalBackupRaw } from '@/services/storage/local-backup';

async function repairPage(page: NotePage): Promise<NotePage> {
  const asset = await repairCloudAsset(page.asset, page.bundleId, page.id, 'master');
  const answerAsset = page.answerAsset
    ? await repairCloudAsset(page.answerAsset, page.bundleId, `${page.id}_back`, 'back')
    : null;
  return { ...page, asset, answerAsset };
}

function indexBackupPages(backup: AppData): Map<string, NotePage> {
  const map = new Map<string, NotePage>();
  for (const bundle of backup.bundles) {
    for (const page of bundle.pages) {
      map.set(`${bundle.id}:${page.id}`, page);
      if (!map.has(`:${page.id}`)) map.set(`:${page.id}`, page);
    }
  }
  return map;
}

/** Reuse asset URIs from local backup when Drive metadata points at empty placeholders. */
async function mergeAssetsFromLocalBackup(data: AppData): Promise<AppData> {
  const raw = await readLocalBackupRaw();
  if (!raw) return data;

  let backup: AppData;
  try {
    backup = JSON.parse(raw) as AppData;
  } catch {
    return data;
  }

  const backupPages = indexBackupPages(backup);

  const bundles = await Promise.all(
    data.bundles.map(async (bundle) => ({
      ...bundle,
      pages: await Promise.all(
        bundle.pages.map(async (page) => {
          if (await assetHasReadableImage(page.asset, page.bundleId, page.id)) {
            return page;
          }

          const fromBackup =
            backupPages.get(`${bundle.id}:${page.id}`) ?? backupPages.get(`:${page.id}`);
          if (!fromBackup) return page;

          if (!(await assetHasReadableImage(fromBackup.asset, fromBackup.bundleId, fromBackup.id))) {
            return page;
          }

          return {
            ...page,
            asset: fromBackup.asset,
            answerAsset: page.answerAsset ?? fromBackup.answerAsset,
          };
        })
      ),
    }))
  );

  return { ...data, bundles };
}

/** Fix stale blob: / broken msherpa pointers using IndexedDB + local backup. */
export async function repairAppDataAssets(data: AppData): Promise<AppData> {
  let next = await mergeAssetsFromLocalBackup(data);

  const bundles = await Promise.all(
    next.bundles.map(async (b) => ({
      ...b,
      pages: await Promise.all(b.pages.map(repairPage)),
    }))
  );

  const trash = await Promise.all(
    next.trash.map(async (entry) => ({
      ...entry,
      bundleSnapshot: {
        ...entry.bundleSnapshot,
        pages: await Promise.all(entry.bundleSnapshot.pages.map(repairPage)),
      },
    }))
  );

  return { ...next, bundles, trash };
}
