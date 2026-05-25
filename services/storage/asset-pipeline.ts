import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

import { resolveImageUri } from '@/lib/files/resolve-image-uri';
import {
  MASTER_JPEG_QUALITY,
  MASTER_MAX_EDGE,
  PREVIEW_JPEG_QUALITY,
  PREVIEW_MAX_EDGE,
  THUMB_JPEG_QUALITY,
  THUMB_MAX_EDGE,
} from '@/lib/files/image-quality';
import type { CloudAsset, CloudSyncStatus } from '@/lib/domain/types';
import { persistUriToWebStore } from '@/services/storage/web-asset-store';

import type { ThumbnailResult } from './types';

const isWeb = Platform.OS === 'web';

async function normalizeJpeg(
  sourceUri: string,
  maxEdge: number,
  quality: number
): Promise<{ uri: string; width?: number; height?: number }> {
  const inputUri = (await resolveImageUri(sourceUri)) ?? sourceUri;
  const probe = await ImageManipulator.manipulateAsync(inputUri, [], {
    format: ImageManipulator.SaveFormat.JPEG,
  });
  const longEdge = Math.max(probe.width ?? 0, probe.height ?? 0);
  const actions =
    longEdge > maxEdge
      ? probe.width && probe.height && probe.width >= probe.height
        ? [{ resize: { width: maxEdge } }]
        : [{ resize: { height: maxEdge } }]
      : [];

  return ImageManipulator.manipulateAsync(inputUri, actions, {
    compress: quality,
    format: ImageManipulator.SaveFormat.JPEG,
  });
}

export async function processMasterImage(sourceUri: string) {
  return normalizeJpeg(sourceUri, MASTER_MAX_EDGE, MASTER_JPEG_QUALITY);
}

export async function processThumbnailImage(sourceUri: string) {
  return normalizeJpeg(sourceUri, THUMB_MAX_EDGE, THUMB_JPEG_QUALITY);
}

export async function processPreviewImage(sourceUri: string) {
  return normalizeJpeg(sourceUri, PREVIEW_MAX_EDGE, PREVIEW_JPEG_QUALITY);
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
  const thumb = await processThumbnailImage(sourceUri);
  const preview = await processPreviewImage(sourceUri);

  if (isWeb) {
    const thumbnailUri = await persistUriToWebStore(thumb.uri, bundleId, pageId, 'thumb');
    const localMiniUri = await persistUriToWebStore(preview.uri, bundleId, pageId, 'mini');
    return {
      thumbnailUri,
      localMiniUri,
      width: thumb.width ?? THUMB_MAX_EDGE,
      height: thumb.height ?? THUMB_MAX_EDGE,
    };
  }

  const dir = bundleAssetDir(bundleId);
  await ensureDir(dir);
  const FileSystem = await import('expo-file-system/legacy');
  const thumbnailUri = `${dir}${pageId}_thumb.jpg`;
  const localMiniUri = `${dir}${pageId}_preview.jpg`;

  await FileSystem.copyAsync({ from: thumb.uri, to: thumbnailUri });
  await FileSystem.copyAsync({ from: preview.uri, to: localMiniUri });

  return {
    thumbnailUri,
    localMiniUri,
    width: thumb.width ?? THUMB_MAX_EDGE,
    height: thumb.height ?? THUMB_MAX_EDGE,
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
  const master = await processMasterImage(sourceUri);

  if (isWeb) {
    return persistUriToWebStore(master.uri, bundleId, pageId, 'master');
  }

  const dir = bundleAssetDir(bundleId);
  await ensureDir(dir);
  const FileSystem = await import('expo-file-system/legacy');
  const dest = `${dir}${pageId}_master.jpg`;
  await FileSystem.copyAsync({ from: master.uri, to: dest });
  return dest;
}
