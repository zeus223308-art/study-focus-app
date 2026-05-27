import { Platform } from 'react-native';

import type { CloudAsset } from '@/lib/domain/types';
import { isStaleWebBlobUri } from '@/lib/files/resolve-image-uri';
import { nativeUriExists } from '@/lib/files/hydrate-backup-assets';
import {
  getWebAssetBlobByKey,
  listWebAssetKeysWithPrefix,
  parseWebStoredUri,
  putWebAsset,
  toWebStoredUri,
  webAssetKey,
  type WebAssetRole,
} from '@/services/storage/web-asset-store';

const ROLE_PRIORITY: WebAssetRole[] = ['master', 'mini', 'thumb', 'back'];

export function getPreviewUriCandidates(asset: CloudAsset): string[] {
  return uniqueUris([asset.localMiniUri, asset.thumbnailUri, asset.originalLocalUri]);
}

export function getFullUriCandidates(asset: CloudAsset): string[] {
  return uniqueUris([asset.originalLocalUri, asset.localMiniUri, asset.thumbnailUri]);
}

function uniqueUris(uris: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of uris) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

export async function uriIsReadable(uri: string | null | undefined): Promise<boolean> {
  if (!uri || isStaleWebBlobUri(uri)) return false;

  const key = parseWebStoredUri(uri);
  if (key) {
    if (Platform.OS === 'web') {
      const blob = await getWebAssetBlobByKey(key);
      return blob != null && blob.size > 0;
    }
    return false;
  }

  if (uri.startsWith('file:')) return nativeUriExists(uri);
  if (uri.startsWith('data:') || uri.startsWith('http://') || uri.startsWith('https://')) {
    return true;
  }

  return false;
}

async function collectCandidateUris(
  asset: CloudAsset,
  bundleId: string,
  pageId: string,
  role: WebAssetRole
): Promise<string[]> {
  const canonical = toWebStoredUri(webAssetKey(bundleId, pageId, role));
  const fromAsset = getFullUriCandidates(asset);
  const fromStore: string[] = [];

  if (Platform.OS === 'web') {
    const keys = await listWebAssetKeysWithPrefix(`${bundleId}/${pageId}/`);
    for (const r of ROLE_PRIORITY) {
      const key = webAssetKey(bundleId, pageId, r);
      if (keys.includes(key)) fromStore.push(toWebStoredUri(key));
    }
    for (const key of keys) {
      fromStore.push(toWebStoredUri(key));
    }
  }

  return uniqueUris([canonical, ...fromAsset, ...fromStore]);
}

/** First readable URI for this page, promoting a derivative blob to master if needed. */
export async function ensureCanonicalMasterUri(
  asset: CloudAsset,
  bundleId: string,
  pageId: string,
  role: WebAssetRole = 'master'
): Promise<string | null> {
  const masterKey = webAssetKey(bundleId, pageId, role);
  const masterUri = toWebStoredUri(masterKey);

  if (await uriIsReadable(masterUri)) return masterUri;

  const candidates = await collectCandidateUris(asset, bundleId, pageId, role);
  for (const uri of candidates) {
    if (!(await uriIsReadable(uri))) continue;

    const key = parseWebStoredUri(uri);
    if (Platform.OS === 'web' && key && key !== masterKey) {
      const blob = await getWebAssetBlobByKey(key);
      if (blob && blob.size > 0) {
        await putWebAsset(masterKey, blob);
        return masterUri;
      }
    }

    if (uri !== masterUri) return uri;
    return masterUri;
  }

  return null;
}

export async function assetHasReadableImage(
  asset: CloudAsset,
  bundleId: string,
  pageId: string,
  role: WebAssetRole = 'master'
): Promise<boolean> {
  const candidates = await collectCandidateUris(asset, bundleId, pageId, role);
  for (const uri of candidates) {
    if (await uriIsReadable(uri)) return true;
  }
  return false;
}

/** Prefer canonical IndexedDB / file master when stored URIs are stale placeholders. */
export async function repairCloudAsset(
  asset: CloudAsset,
  bundleId: string,
  pageId: string,
  role: WebAssetRole = 'master'
): Promise<CloudAsset> {
  const masterUri = await ensureCanonicalMasterUri(asset, bundleId, pageId, role);
  if (!masterUri) return asset;

  const thumbKey = webAssetKey(bundleId, pageId, 'thumb');
  const miniKey = webAssetKey(bundleId, pageId, 'mini');
  const thumbUri = toWebStoredUri(thumbKey);
  const miniUri = toWebStoredUri(miniKey);

  return {
    ...asset,
    originalLocalUri: masterUri,
    thumbnailUri: (await uriIsReadable(asset.thumbnailUri))
      ? asset.thumbnailUri
      : (await uriIsReadable(thumbUri))
        ? thumbUri
        : asset.thumbnailUri,
    localMiniUri: (await uriIsReadable(asset.localMiniUri))
      ? asset.localMiniUri
      : (await uriIsReadable(miniUri))
        ? miniUri
        : asset.localMiniUri,
  };
}
