import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

import type { CloudAsset, CloudSyncStatus } from '@/lib/domain/types';
import type { ThumbnailResult } from './types';

const THUMB_MAX_WIDTH = 480;
const THUMB_QUALITY = 0.72;

export async function ensureDir(path: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
}

export function bundleAssetDir(bundleId: string): string {
  return `${FileSystem.documentDirectory}assets/${bundleId}/`;
}

export async function createMiniThumbnail(
  sourceUri: string,
  bundleId: string,
  pageId: string
): Promise<ThumbnailResult> {
  const dir = bundleAssetDir(bundleId);
  await ensureDir(dir);

  const manipulated = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ resize: { width: THUMB_MAX_WIDTH } }],
    { compress: THUMB_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
  );

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
  const dir = bundleAssetDir(bundleId);
  await ensureDir(dir);
  const dest = `${dir}${pageId}_master.jpg`;
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
}
