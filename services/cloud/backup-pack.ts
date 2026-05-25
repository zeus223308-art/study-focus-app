import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import type { AppData, CloudAsset, NotePage } from '@/lib/domain/types';
import { migratePersistedWebAssets } from '@/lib/files/migrate-web-assets';
import { resolveImageUri } from '@/lib/files/resolve-image-uri';
import {
  processPreviewImage,
  processThumbnailImage,
} from '@/services/storage/asset-pipeline';
import {
  parseWebStoredUri,
  putWebAsset,
  toWebStoredUri,
  uriToBlob,
  webAssetKey,
  type WebAssetRole,
} from '@/services/storage/web-asset-store';

export type BackupEnvelope = {
  formatVersion: 1;
  exportedAt: string;
  appData: AppData;
  /** asset key (bundle/page/role) → base64 */
  assets: Record<string, string>;
};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mime = 'image/jpeg'): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function readUriAsBase64(
  uri: string,
  bundleId: string,
  pageId: string,
  role: WebAssetRole,
  assets: Record<string, string>
): Promise<string> {
  const existingKey = parseWebStoredUri(uri);
  if (existingKey && assets[existingKey]) {
    return toWebStoredUri(existingKey);
  }

  const key = existingKey ?? webAssetKey(bundleId, pageId, role);

  if (existingKey && Platform.OS === 'web') {
    const { getWebAssetBlobByKey } = await import('@/services/storage/web-asset-store');
    const blob = await getWebAssetBlobByKey(existingKey);
    if (blob) {
      assets[key] = await blobToBase64(blob);
      return toWebStoredUri(key);
    }
  }

  if (uri.startsWith('file:') && Platform.OS !== 'web') {
    const b64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });
    assets[key] = b64;
    return toWebStoredUri(key);
  }

  if (uri.startsWith('http') || uri.startsWith('blob:') || uri.startsWith('data:')) {
    try {
      const blob = await uriToBlob(uri);
      assets[key] = await blobToBase64(blob);
      if (Platform.OS === 'web') {
        await putWebAsset(key, blob);
      }
      return toWebStoredUri(key);
    } catch {
      return uri;
    }
  }

  return uri;
}

async function uriForBackupEmbed(uri: string): Promise<string> {
  const resolved = (await resolveImageUri(uri)) ?? uri;
  return resolved;
}

async function packCloudAsset(
  asset: CloudAsset,
  bundleId: string,
  pageId: string,
  role: WebAssetRole,
  assets: Record<string, string>
): Promise<CloudAsset> {
  const masterSource = asset.originalLocalUri ?? asset.thumbnailUri;
  const originalLocalUri = await readUriAsBase64(
    await uriForBackupEmbed(masterSource),
    bundleId,
    pageId,
    'master',
    assets
  );

  let thumbUri = asset.thumbnailUri;
  if (asset.originalLocalUri) {
    try {
      const generated = await processThumbnailImage(await uriForBackupEmbed(asset.originalLocalUri));
      thumbUri = generated.uri;
    } catch {
      thumbUri = asset.thumbnailUri;
    }
  }

  let miniUri = asset.localMiniUri;
  if (asset.originalLocalUri) {
    try {
      const generated = await processPreviewImage(await uriForBackupEmbed(asset.originalLocalUri));
      miniUri = generated.uri;
    } catch {
      miniUri = asset.localMiniUri ?? thumbUri;
    }
  }

  const thumbnailUri = await readUriAsBase64(
    await uriForBackupEmbed(thumbUri),
    bundleId,
    pageId,
    role,
    assets
  );
  const localMiniUri = await readUriAsBase64(
    await uriForBackupEmbed(miniUri),
    bundleId,
    `${pageId}_mini`,
    'mini',
    assets
  );

  return {
    ...asset,
    thumbnailUri,
    localMiniUri,
    originalLocalUri,
    syncStatus: 'synced',
  };
}

async function packPage(page: NotePage, assets: Record<string, string>): Promise<NotePage> {
  const asset = await packCloudAsset(page.asset, page.bundleId, page.id, 'thumb', assets);
  const answerAsset = page.answerAsset
    ? await packCloudAsset(page.answerAsset, page.bundleId, `${page.id}_back`, 'back', assets)
    : null;
  return { ...page, asset, answerAsset };
}

export async function packAppDataForBackup(data: AppData): Promise<BackupEnvelope> {
  const assets: Record<string, string> = {};
  const bundles = await Promise.all(
    data.bundles.map(async (b) => ({
      ...b,
      pages: await Promise.all(b.pages.map((p) => packPage(p, assets))),
    }))
  );

  const trash = await Promise.all(
    data.trash.map(async (entry) => ({
      ...entry,
      bundleSnapshot: {
        ...entry.bundleSnapshot,
        pages: await Promise.all(entry.bundleSnapshot.pages.map((p) => packPage(p, assets))),
      },
    }))
  );

  return {
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    appData: {
      ...data,
      bundles,
      trash,
      settings: {
        ...data.settings,
        cloudBackupEnabled: true,
      },
    },
    assets,
  };
}

export async function restoreBackupEnvelope(envelope: BackupEnvelope): Promise<AppData> {
  if (Platform.OS === 'web' && typeof atob !== 'undefined') {
    for (const [key, b64] of Object.entries(envelope.assets)) {
      if (!b64) continue;
      await putWebAsset(key, base64ToBlob(b64));
    }
  }

  let data = envelope.appData;
  data = await migratePersistedWebAssets(data);
  return {
    ...data,
    settings: {
      ...data.settings,
      cloudBackupEnabled: true,
      lastCloudSyncAt: envelope.exportedAt,
    },
  };
}

export function parseBackupJson(raw: string): BackupEnvelope {
  const parsed = JSON.parse(raw) as BackupEnvelope;
  if (parsed.formatVersion !== 1 || !parsed.appData) {
    throw new Error('Invalid backup format');
  }
  return parsed;
}

export function shouldPreferRemoteBackup(local: AppData, remote: BackupEnvelope): boolean {
  if (local.bundles.length === 0 && remote.appData.bundles.length > 0) return true;
  if (remote.appData.bundles.length === 0) return false;
  const localSync = local.settings.lastCloudSyncAt;
  if (!localSync) return false;
  return remote.exportedAt > localSync;
}
