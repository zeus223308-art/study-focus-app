import type { AppData } from '@/lib/domain/types';

export function countAppPages(data: AppData): number {
  return data.bundles.reduce((n, b) => n + b.pages.length, 0);
}

export function hasRecoverableContent(data: AppData): boolean {
  return countAppPages(data) > 0;
}

export function shouldUploadDriveBackup(data: AppData): boolean {
  return hasRecoverableContent(data);
}
