import { Platform } from 'react-native';

import { isStaleWebBlobUri } from '@/lib/files/resolve-image-uri';
import { parseWebStoredUri, persistUriToWebStore } from '@/services/storage/web-asset-store';

const DRAFT_BUNDLE_ID = 'capture_drafts';

function draftPageId(): string {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Web capture/edit produces short-lived blob: URLs (crop, ink bake, manipulator).
 * Persist bytes into IndexedDB before save so processMasterImage can read them later.
 */
export async function stabilizeCaptureImageUri(uri: string): Promise<string> {
  if (Platform.OS !== 'web') return uri;
  if (parseWebStoredUri(uri)) return uri;

  const shouldPersist =
    isStaleWebBlobUri(uri) || uri.startsWith('data:') || uri.startsWith('http');

  if (!shouldPersist) return uri;

  return persistUriToWebStore(uri, DRAFT_BUNDLE_ID, draftPageId(), 'master');
}
