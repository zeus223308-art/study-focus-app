import { Platform } from 'react-native';

import type { CloudAsset } from '@/lib/domain/types';
import { isStaleWebBlobUri } from '@/lib/files/resolve-image-uri';
import { nativeUriExists } from '@/lib/files/hydrate-backup-assets';
import {
  getWebAssetBlobByKey,
  parseWebStoredUri,
  toWebStoredUri,
  webAssetKey,
  type WebAssetRole,
} from '@/services/storage/web-asset-store';

export function getPreviewUriCandidates(asset: CloudAsset): string[] {
  return [asset.localMiniUri, asset.thumbnailUri, asset.originalLocalUri].filter(
    (u): u is string => Boolean(u)
  );
}

export function getFullUriCandidates(asset: CloudAsset): string[] {
  return [asset.originalLocalUri, asset.localMiniUri, asset.thumbnailUri].filter(
    (u): u is string => Boolean(u)
  );
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

/** Prefer canonical IndexedDB / file master when stored URIs are stale placeholders. */
export async function repairCloudAsset(
  asset: CloudAsset,
  bundleId: string,
  pageId: string,
  role: WebAssetRole = 'master'
): Promise<CloudAsset> {
  const canonical = toWebStoredUri(webAssetKey(bundleId, pageId, role));
  const canonicalReadable = await uriIsReadable(canonical);

  let next = { ...asset };

  if (canonicalReadable) {
    if (!(await uriIsReadable(next.originalLocalUri))) {
      next.originalLocalUri = canonical;
    }
  }

  return next;
}
