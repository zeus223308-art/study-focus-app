import { Platform } from 'react-native';

import {
  getWebAssetObjectUrl,
  parseWebStoredUri,
} from '@/services/storage/web-asset-store';

/** Resolve display URI (msherpa-asset:// → blob URL on web). */
export async function resolveImageUri(uri: string | null | undefined): Promise<string | null> {
  if (!uri) return null;
  if (uri.startsWith('data:') || uri.startsWith('file:')) return uri;

  const key = parseWebStoredUri(uri);
  if (key) {
    const resolved = await getWebAssetObjectUrl(key);
    return resolved ?? null;
  }

  if (Platform.OS === 'web' && uri.startsWith('blob:')) {
    return null;
  }

  return uri;
}

export function isStaleWebBlobUri(uri: string | null | undefined): boolean {
  return Platform.OS === 'web' && typeof uri === 'string' && uri.startsWith('blob:');
}
