import type { AppData } from '@/lib/domain/types';

/** All stored problem photos (includes archived bundles). */
export function countAppPages(data: AppData): number {
  return data.bundles.reduce((n, b) => n + b.pages.length, 0);
}

/** Photos visible in subject folders (excludes archived bundles). */
export function countActiveAppPages(data: AppData): number {
  return data.bundles
    .filter((b) => !b.archived)
    .reduce((n, b) => n + b.pages.length, 0);
}

export function countActivePagesForSubject(data: AppData, subjectId: string): number {
  return data.bundles
    .filter((b) => b.subjectId === subjectId && !b.archived)
    .reduce((n, b) => n + b.pages.length, 0);
}

export function hasRecoverableContent(data: AppData): boolean {
  return countAppPages(data) > 0;
}

export function shouldUploadDriveBackup(data: AppData): boolean {
  return hasRecoverableContent(data);
}
