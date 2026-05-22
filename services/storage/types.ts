import type { AppData, NoteBundle, NotePage } from '@/lib/domain/types';

export type ThumbnailResult = {
  thumbnailUri: string;
  localMiniUri: string;
  width: number;
  height: number;
};

export type UploadResult = {
  remotePath: string;
  uploadedAt: string;
};

export interface StorageProvider {
  loadAppData(): Promise<AppData>;
  saveAppData(data: AppData): Promise<void>;
  createThumbnail(sourceUri: string, bundleId: string, pageId: string): Promise<ThumbnailResult>;
  uploadMasterAsset(localUri: string, remotePath: string): Promise<UploadResult>;
  fetchMasterAsset(remotePath: string, localDestUri: string): Promise<string>;
  deleteRemoteAsset(remotePath: string): Promise<void>;
  syncAllPending(data: AppData): Promise<AppData>;
  restoreFromCloudBackup(): Promise<AppData | null>;
}

export type FreemiumCheck = {
  allowed: boolean;
  reason: 'images' | 'memos' | null;
  usedImages: number;
  usedMemos: number;
};

export function checkFreemiumLimits(data: AppData): FreemiumCheck {
  const usedImages = data.bundles.reduce((n, b) => n + b.pages.length, 0);
  const usedMemos = data.bundles.filter((b) =>
    b.pages.some((p) => p.textNote.trim().length > 0 || p.layers.some((l) => l.strokes.length > 0))
  ).length;

  if (data.settings.tier === 'pro') {
    return { allowed: true, reason: null, usedImages, usedMemos };
  }
  if (usedImages >= data.settings.photoLimit) {
    return { allowed: false, reason: 'images', usedImages, usedMemos };
  }
  if (usedMemos >= data.settings.memoLimit) {
    return { allowed: false, reason: 'memos', usedImages, usedMemos };
  }
  return { allowed: true, reason: null, usedImages, usedMemos };
}

export function countPages(data: AppData): number {
  return data.bundles.reduce((n, b) => n + b.pages.length, 0);
}

export function findBundle(data: AppData, bundleId: string): NoteBundle | undefined {
  return data.bundles.find((b) => b.id === bundleId);
}

export function findPage(data: AppData, pageId: string): { bundle: NoteBundle; page: NotePage } | null {
  for (const bundle of data.bundles) {
    const page = bundle.pages.find((p) => p.id === pageId);
    if (page) return { bundle, page };
  }
  return null;
}
