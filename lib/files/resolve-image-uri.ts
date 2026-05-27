import { Platform } from 'react-native';

import { uriIsReadable } from '@/lib/files/asset-uri-utils';
import {
  getWebAssetObjectUrl,
  parseWebStoredUri,
} from '@/services/storage/web-asset-store';

/** Resolve display URI (msherpa-asset:// → blob URL on web). */
export async function resolveImageUri(uri: string | null | undefined): Promise<string | null> {
  if (!uri) return null;
  if (isStaleWebBlobUri(uri)) return null;
  if (uri.startsWith('data:') || uri.startsWith('file:') || uri.startsWith('content:')) return uri;

  const key = parseWebStoredUri(uri);
  if (key) {
    const resolved = await getWebAssetObjectUrl(key);
    return resolved ?? null;
  }

  if (uri.startsWith('http://') || uri.startsWith('https://')) return uri;

  return null;
}

/** Try candidates in order; skip unreadable msherpa placeholders and dead blob: URLs. */
export async function resolveFirstReadableUri(
  candidates: (string | null | undefined)[]
): Promise<string | null> {
  for (const uri of candidates) {
    if (!uri || isStaleWebBlobUri(uri)) continue;
    if (!(await uriIsReadable(uri))) continue;
    const resolved = await resolveImageUri(uri);
    if (resolved) return resolved;
  }
  return null;
}

export function isStaleWebBlobUri(uri: string | null | undefined): boolean {
  return Platform.OS === 'web' && typeof uri === 'string' && uri.startsWith('blob:');
}
