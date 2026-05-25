import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import type { AppData, CloudAsset } from '@/lib/domain/types';
export type BackupAssetPayload = {
  assets: Record<string, string>;
  appData: AppData;
};
import { bundleAssetDir, ensureDir } from '@/services/storage/asset-pipeline';
import {
  parseWebStoredUri,
  putWebAsset,
  toWebStoredUri,
  webAssetKey,
  type WebAssetRole,
} from '@/services/storage/web-asset-store';

function base64ToBlob(base64: string, mime = 'image/jpeg'): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function parseAssetStorageKey(
  key: string
): { bundleId: string; pageId: string; role: WebAssetRole } | null {
  const parts = key.split('/');
  if (parts.length !== 3) return null;
  const role = parts[2] as WebAssetRole;
  if (role !== 'master' && role !== 'thumb' && role !== 'mini' && role !== 'back') return null;
  return { bundleId: parts[0], pageId: parts[1], role };
}

function nativeAssetFilename(pageId: string, role: WebAssetRole): string {
  if (role === 'master') return `${pageId}_master.jpg`;
  if (role === 'mini') return `${pageId}_preview.jpg`;
  return `${pageId}_thumb.jpg`;
}

async function nativeFileExists(path: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(path);
    return info.exists === true;
  } catch {
    return false;
  }
}

/** Write one embedded backup asset to on-device storage. */
export async function persistEmbeddedAsset(
  key: string,
  base64: string
): Promise<string | null> {
  if (!base64) return null;
  const parsed = parseAssetStorageKey(key);
  if (!parsed) return null;

  if (Platform.OS === 'web') {
    await putWebAsset(key, base64ToBlob(base64));
    return toWebStoredUri(key);
  }

  const dir = bundleAssetDir(parsed.bundleId);
  await ensureDir(dir);
  const dest = `${dir}${nativeAssetFilename(parsed.pageId, parsed.role)}`;
  try {
    await FileSystem.writeAsStringAsync(dest, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return dest;
  } catch {
    return null;
  }
}

/** Load all base64 assets from a Drive backup envelope into local/web storage. */
export async function hydrateBackupAssets(envelope: BackupAssetPayload): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  for (const [key, b64] of Object.entries(envelope.assets)) {
    if (!b64) continue;
    const uri = await persistEmbeddedAsset(key, b64);
    if (uri) resolved.set(key, uri);
  }
  return resolved;
}

function remapUri(uri: string, resolved: Map<string, string>): string {
  const key = parseWebStoredUri(uri);
  if (!key) return uri;
  return resolved.get(key) ?? uri;
}

function remapCloudAsset(asset: CloudAsset, resolved: Map<string, string>): CloudAsset {
  return {
    ...asset,
    thumbnailUri: remapUri(asset.thumbnailUri, resolved),
    localMiniUri: remapUri(asset.localMiniUri, resolved),
    originalLocalUri: asset.originalLocalUri
      ? remapUri(asset.originalLocalUri, resolved)
      : null,
  };
}

/** After hydrate, point msherpa-asset URIs at real file paths (native) or stored blobs (web). */
export function remapAppDataAssetUris(data: AppData, resolved: Map<string, string>): AppData {
  if (resolved.size === 0) return data;

  const remapPages = (pages: AppData['bundles'][0]['pages']) =>
    pages.map((page) => ({
      ...page,
      asset: remapCloudAsset(page.asset, resolved),
      answerAsset: page.answerAsset
        ? remapCloudAsset(page.answerAsset, resolved)
        : null,
    }));

  return {
    ...data,
    bundles: data.bundles.map((b) => ({ ...b, pages: remapPages(b.pages) })),
    trash: data.trash.map((entry) => ({
      ...entry,
      bundleSnapshot: {
        ...entry.bundleSnapshot,
        pages: remapPages(entry.bundleSnapshot.pages),
      },
    })),
  };
}

export function placeholderDerivativeUris(
  bundleId: string,
  pageId: string
): { thumbnailUri: string; localMiniUri: string } {
  return {
    thumbnailUri: toWebStoredUri(webAssetKey(bundleId, pageId, 'thumb')),
    localMiniUri: toWebStoredUri(webAssetKey(bundleId, pageId, 'mini')),
  };
}

export async function nativeUriExists(uri: string | null | undefined): Promise<boolean> {
  if (!uri) return false;
  if (uri.startsWith('file:')) return nativeFileExists(uri);
  return false;
}
