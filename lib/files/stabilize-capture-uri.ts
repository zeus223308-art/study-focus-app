import { Platform } from 'react-native';

import { ensureManipulableImageUri } from '@/lib/files/ensure-manipulable-uri';
import { isDirectImageUri } from '@/lib/files/direct-image-uri';
import { parseWebStoredUri, persistUriToWebStore } from '@/services/storage/web-asset-store';

const DRAFT_BUNDLE_ID = 'capture_drafts';

function draftPageId(): string {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function persistNativeDraft(uri: string): Promise<string> {
  const FileSystem = await import('expo-file-system/legacy');
  const dir = `${FileSystem.cacheDirectory}capture_drafts/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const dest = `${dir}${draftPageId()}.jpg`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

/**
 * Capture/edit produces short-lived blob: URLs (web) or temp camera paths (native).
 * Persist into durable storage before preview/save so thumbnails stay visible.
 */
export async function stabilizeCaptureImageUri(uri: string): Promise<string> {
  if (parseWebStoredUri(uri)) return uri;

  if (Platform.OS === 'web') {
    if (isDirectImageUri(uri)) {
      return persistUriToWebStore(uri, DRAFT_BUNDLE_ID, draftPageId(), 'master');
    }
    return uri;
  }

  if (
    uri.startsWith('file:') ||
    uri.startsWith('content:') ||
    uri.startsWith('ph:') ||
    uri.startsWith('assets-library:')
  ) {
    const workable = await ensureManipulableImageUri(uri);
    try {
      return await persistNativeDraft(workable);
    } catch {
      return workable;
    }
  }

  return uri;
}
