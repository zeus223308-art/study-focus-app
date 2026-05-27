import * as FileSystem from 'expo-file-system/legacy';

import { Platform } from 'react-native';



import type { AppData, CloudAsset, NotePage } from '@/lib/domain/types';

import {

  hydrateBackupAssets,

  placeholderDerivativeUris,

  remapAppDataAssetUris,

} from '@/lib/files/hydrate-backup-assets';

import { migratePersistedWebAssets } from '@/lib/files/migrate-web-assets';

import { ensureAppDataDerivatives } from '@/lib/files/regenerate-derivatives';

import { upgradeLegacyPhotoQuality } from '@/lib/files/upgrade-legacy-assets';

import { resolveImageUri } from '@/lib/files/resolve-image-uri';

import {

  parseWebStoredUri,

  putWebAsset,

  toWebStoredUri,

  uriToBlob,

  webAssetKey,

  type WebAssetRole,

} from '@/services/storage/web-asset-store';



export type BackupDerivativePolicy = 'full' | 'master_only';



export type BackupEnvelope = {

  formatVersion: 1;

  exportedAt: string;

  /** New backups: only masters in `assets`; thumbs rebuilt on restore/device. */

  derivativePolicy?: BackupDerivativePolicy;

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



/** Pack one asset: master in backup JSON; thumbs are local-only placeholders. */

async function packCloudAssetMasterOnly(

  asset: CloudAsset,

  bundleId: string,

  pageId: string,

  assets: Record<string, string>

): Promise<CloudAsset> {

  const masterSource = asset.originalLocalUri ?? asset.localMiniUri ?? asset.thumbnailUri;

  let originalLocalUri = asset.originalLocalUri ?? asset.thumbnailUri;



  try {

    originalLocalUri = await readUriAsBase64(

      await uriForBackupEmbed(masterSource),

      bundleId,

      pageId,

      'master',

      assets

    );

  } catch {

    originalLocalUri = asset.originalLocalUri ?? asset.thumbnailUri;

  }



  const placeholders = placeholderDerivativeUris(bundleId, pageId);



  return {

    ...asset,

    thumbnailUri: placeholders.thumbnailUri,

    localMiniUri: placeholders.localMiniUri,

    originalLocalUri,

    syncStatus: 'synced',

  };

}



/** Legacy full pack (master + thumb + mini embedded) for backward compatibility reads. */

async function packCloudAssetFull(

  asset: CloudAsset,

  bundleId: string,

  pageId: string,

  assets: Record<string, string>

): Promise<CloudAsset> {

  const packed = await packCloudAssetMasterOnly(asset, bundleId, pageId, assets);

  const masterUri = packed.originalLocalUri ?? asset.thumbnailUri;



  let thumbnailUri = packed.thumbnailUri;

  let localMiniUri = packed.localMiniUri;



  try {

    thumbnailUri = await readUriAsBase64(

      await uriForBackupEmbed(asset.thumbnailUri),

      bundleId,

      pageId,

      'thumb',

      assets

    );

  } catch {

    /* keep placeholder */

  }



  try {

    if (asset.localMiniUri) {

      localMiniUri = await readUriAsBase64(

        await uriForBackupEmbed(asset.localMiniUri),

        bundleId,

        pageId,

        'mini',

        assets

      );

    }

  } catch {

    /* keep placeholder */

  }



  if (!assets[parseWebStoredUri(thumbnailUri) ?? '']) {

    try {

      const { processThumbnailImage, processPreviewImage } = await import(

        '@/services/storage/asset-pipeline'

      );

      const thumb = await processThumbnailImage(await uriForBackupEmbed(masterUri));

      thumbnailUri = await readUriAsBase64(thumb.uri, bundleId, pageId, 'thumb', assets);

      const preview = await processPreviewImage(await uriForBackupEmbed(masterUri));

      localMiniUri = await readUriAsBase64(preview.uri, bundleId, pageId, 'mini', assets);

    } catch {

      /* placeholders only */

    }

  }



  return {

    ...packed,

    thumbnailUri,

    localMiniUri,

  };

}



async function packCloudAsset(

  asset: CloudAsset,

  bundleId: string,

  pageId: string,

  assets: Record<string, string>,

  policy: BackupDerivativePolicy

): Promise<CloudAsset> {

  if (policy === 'master_only') {

    return packCloudAssetMasterOnly(asset, bundleId, pageId, assets);

  }

  return packCloudAssetFull(asset, bundleId, pageId, assets);

}



async function packPage(

  page: NotePage,

  assets: Record<string, string>,

  policy: BackupDerivativePolicy

): Promise<NotePage> {

  const asset = await packCloudAsset(page.asset, page.bundleId, page.id, assets, policy);

  const answerAsset = page.answerAsset

    ? await packCloudAsset(page.answerAsset, page.bundleId, `${page.id}_back`, assets, policy)

    : null;

  return { ...page, asset, answerAsset };

}



export async function packAppDataForBackup(data: AppData): Promise<BackupEnvelope> {

  const assets: Record<string, string> = {};

  const policy: BackupDerivativePolicy = 'master_only';



  const bundles = await Promise.all(

    data.bundles.map(async (b) => ({

      ...b,

      pages: await Promise.all(b.pages.map((p) => packPage(p, assets, policy))),

    }))

  );



  const trash = await Promise.all(

    data.trash.map(async (entry) => ({

      ...entry,

      bundleSnapshot: {

        ...entry.bundleSnapshot,

        pages: await Promise.all(

          entry.bundleSnapshot.pages.map((p) => packPage(p, assets, policy))

        ),

      },

    }))

  );



  return {

    formatVersion: 1,

    derivativePolicy: policy,

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

  const resolved = await hydrateBackupAssets(envelope);



  let data = remapAppDataAssetUris(envelope.appData, resolved);



  data = await migratePersistedWebAssets(data);



  const derivatives = await ensureAppDataDerivatives(data);

  data = derivatives.data;



  const quality = await upgradeLegacyPhotoQuality(data);

  data = quality.data;



  return {

    ...data,

    settings: {

      ...data.settings,

      cloudBackupEnabled: true,

      lastCloudSyncAt: envelope.exportedAt,

      lastDerivativeRegenAt: new Date().toISOString(),

      lastDerivativeRegenFailed: derivatives.failed,

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
  const localPages = local.bundles.reduce((n, b) => n + b.pages.length, 0);
  const remotePages = remote.appData.bundles.reduce((n, b) => n + b.pages.length, 0);

  if (remotePages === 0) return false;
  if (localPages === 0) return true;
  if (remotePages > localPages) return true;

  const localSync = local.settings.lastCloudSyncAt;
  if (!localSync) return false;

  return remote.exportedAt > localSync;
}


