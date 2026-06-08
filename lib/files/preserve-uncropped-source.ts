import { Platform } from 'react-native';

import type { CloudAsset } from '@/lib/domain/types';
import { uriIsReadable } from '@/lib/files/asset-uri-utils';
import { resolveImageUri } from '@/lib/files/resolve-image-uri';
import { bundleAssetDir, ensureDir } from '@/services/storage/asset-pipeline';
import {
  getWebAssetBlobByKey,
  persistUriToWebStore,
  toWebStoredUri,
  webAssetKey,
} from '@/services/storage/web-asset-store';

/** Copy the current master to a dedicated source slot before it is overwritten by a crop. */
export async function ensureUncroppedSourceUri(
  asset: CloudAsset,
  bundleId: string,
  storagePageId: string
): Promise<string | null> {
  if (asset.uncroppedLocalUri && (await uriIsReadable(asset.uncroppedLocalUri))) {
    return asset.uncroppedLocalUri;
  }

  const master = asset.originalLocalUri;
  if (!master || !(await uriIsReadable(master))) return null;

  const resolved = (await resolveImageUri(master)) ?? master;

  if (Platform.OS === 'web') {
    const key = webAssetKey(bundleId, storagePageId, 'source');
    const existing = await getWebAssetBlobByKey(key);
    if (existing && existing.size > 0) return toWebStoredUri(key);
    try {
      return await persistUriToWebStore(resolved, bundleId, storagePageId, 'source');
    } catch {
      return null;
    }
  }

  const dir = bundleAssetDir(bundleId);
  await ensureDir(dir);
  const FileSystem = await import('expo-file-system/legacy');
  const dest = `${dir}${storagePageId}_source.jpg`;
  const info = await FileSystem.getInfoAsync(dest);
  if (info.exists) return dest;
  try {
    await FileSystem.copyAsync({ from: resolved, to: dest });
    return dest;
  } catch {
    return null;
  }
}
