import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

import { resolveImageUri } from '@/lib/files/resolve-image-uri';
import type { CloudAsset, CloudSyncStatus } from '@/lib/domain/types';
import { persistUriToWebStore } from '@/services/storage/web-asset-store';

import type { ThumbnailResult } from './types';

const THUMB_MAX_WIDTH = 480;
const THUMB_QUALITY = 0.72;
const isWeb = Platform.OS === 'web';

async function resizeToJpeg(sourceUri: string): Promise<{
  uri: string;
  width?: number;
  height?: number;
}> {
  const inputUri = (await resolveImageUri(sourceUri)) ?? sourceUri;
  return ImageManipulator.manipulateAsync(
    inputUri,
    [{ resize: { width: THUMB_MAX_WIDTH } }],
    { compress: THUMB_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
  );
}

export async function ensureDir(_path: string): Promise<void> {
  if (isWeb) return;
  const FileSystem = await import('expo-file-system/legacy');
  const info = await FileSystem.getInfoAsync(_path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(_path, { intermediates: true });
  }
}

export function bundleAssetDir(bundleId: string): string {
  if (isWeb) return `web-assets/${bundleId}/`;
  const { documentDirectory } = require('expo-file-system/legacy') as typeof import('expo-file-system/legacy');
  return `${documentDirectory}assets/${bundleId}/`;
}

export async function createMiniThumbnail(
  sourceUri: string,
  bundleId: string,
  pageId: string
): Promise<ThumbnailResult> {
  const manipulated = await resizeToJpeg(sourceUri);

  if (isWeb) {
    const stored = await persistUriToWebStore(manipulated.uri, bundleId, pageId, 'thumb');
    return {
      thumbnailUri: stored,
      localMiniUri: stored,
      width: manipulated.width ?? THUMB_MAX_WIDTH,
      height: manipulated.height ?? THUMB_MAX_WIDTH,
    };
  }

  const dir = bundleAssetDir(bundleId);
  await ensureDir(dir);
  const FileSystem = await import('expo-file-system/legacy');
  const thumbnailUri = `${dir}${pageId}_thumb.jpg`;
  const localMiniUri = `${dir}${pageId}_mini.jpg`;

  await FileSystem.copyAsync({ from: manipulated.uri, to: thumbnailUri });
  await FileSystem.copyAsync({ from: manipulated.uri, to: localMiniUri });

  return {
    thumbnailUri,
    localMiniUri,
    width: manipulated.width ?? THUMB_MAX_WIDTH,
    height: manipulated.height ?? THUMB_MAX_WIDTH,
  };
}

export function buildLocalCloudAsset(
  sourceUri: string,
  thumb: ThumbnailResult,
  syncStatus: CloudSyncStatus = 'pending_upload'
): CloudAsset {
  return {
    remotePath: null,
    thumbnailUri: thumb.thumbnailUri,
    localMiniUri: thumb.localMiniUri,
    originalLocalUri: sourceUri,
    syncStatus,
    uploadedAt: null,
    lastFetchedAt: null,
  };
}

export async function persistOriginalCopy(
  sourceUri: string,
  bundleId: string,
  pageId: string
): Promise<string> {
  if (isWeb) {
    const inputUri = (await resolveImageUri(sourceUri)) ?? sourceUri;
    const full = await ImageManipulator.manipulateAsync(inputUri, [], {
      compress: 0.9,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return persistUriToWebStore(full.uri, bundleId, pageId, 'master');
  }

  const dir = bundleAssetDir(bundleId);
  await ensureDir(dir);
  const FileSystem = await import('expo-file-system/legacy');
  const dest = `${dir}${pageId}_master.jpg`;
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
}
