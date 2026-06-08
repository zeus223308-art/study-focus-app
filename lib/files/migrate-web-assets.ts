import { Platform } from 'react-native';

import type { AppData, CloudAsset, NotePage } from '@/lib/domain/types';
import { isStaleWebBlobUri } from '@/lib/files/resolve-image-uri';
import {
  parseWebStoredUri,
  persistUriToWebStore,
  type WebAssetRole,
} from '@/services/storage/web-asset-store';

async function migrateAssetUri(
  uri: string,
  bundleId: string,
  pageId: string,
  role: WebAssetRole
): Promise<string> {
  if (parseWebStoredUri(uri)) return uri;
  if (uri.startsWith('data:') || uri.startsWith('file:')) {
    try {
      return await persistUriToWebStore(uri, bundleId, pageId, role);
    } catch {
      return uri;
    }
  }
  if (isStaleWebBlobUri(uri)) {
    try {
      return await persistUriToWebStore(uri, bundleId, pageId, role);
    } catch {
      return uri;
    }
  }
  return uri;
}

async function migrateCloudAsset(
  asset: CloudAsset,
  bundleId: string,
  pageId: string,
  role: WebAssetRole
): Promise<CloudAsset> {
  const thumbnailUri = await migrateAssetUri(asset.thumbnailUri, bundleId, pageId, role);
  const localMiniUri = await migrateAssetUri(asset.localMiniUri, bundleId, pageId, 'mini');
  const originalLocalUri = asset.originalLocalUri
    ? await migrateAssetUri(asset.originalLocalUri, bundleId, pageId, 'master')
    : null;

  return {
    ...asset,
    thumbnailUri,
    localMiniUri,
    originalLocalUri,
  };
}

async function migratePage(page: NotePage): Promise<NotePage> {
  const asset = await migrateCloudAsset(page.asset, page.bundleId, page.id, 'thumb');
  const answerAsset = page.answerAsset
    ? await migrateCloudAsset(page.answerAsset, page.bundleId, `${page.id}_back`, 'back')
    : null;
  return { ...page, asset, answerAsset };
}

/** On web, move image bytes into IndexedDB and replace ephemeral blob: URLs. */
export async function migratePersistedWebAssets(data: AppData): Promise<AppData> {
  if (Platform.OS !== 'web') return data;

  const bundles = await Promise.all(
    data.bundles.map(async (b) => ({
      ...b,
      pages: await Promise.all(b.pages.map(migratePage)),
    }))
  );

  const trash = await Promise.all(
    data.trash.map(async (entry) => ({
      ...entry,
      bundleSnapshot: {
        ...entry.bundleSnapshot,
        pages: await Promise.all(entry.bundleSnapshot.pages.map(migratePage)),
      },
    }))
  );

  return { ...data, bundles, trash };
}
