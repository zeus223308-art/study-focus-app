import { addHours, addDays, isBefore, parseISO } from 'date-fns';

import type { NoteBundle, TrashLifecycle } from '@/lib/domain/types';

export const TRASH_UI_HOURS = 24;
export const TRASH_BACKUP_DAYS = 3;

export function createTrashLifecycle(bundle: NoteBundle, deletedAt = new Date()): TrashLifecycle {
  const deleted = deletedAt.toISOString();
  return {
    id: `trash_${Date.now()}`,
    bundleId: bundle.id,
    bundleSnapshot: bundle,
    deletedAt: deleted,
    uiExpiresAt: addHours(deletedAt, TRASH_UI_HOURS).toISOString(),
    backupExpiresAt: addDays(deletedAt, TRASH_BACKUP_DAYS).toISOString(),
    cloudHardDeleteAt: addDays(deletedAt, TRASH_BACKUP_DAYS).toISOString(),
    restoredAt: null,
  };
}

export function isVisibleInTrashUI(entry: TrashLifecycle, now = new Date()): boolean {
  return !isBefore(parseISO(entry.uiExpiresAt), now);
}

export function canRestoreFromBackup(entry: TrashLifecycle, now = new Date()): boolean {
  if (entry.restoredAt) return false;
  return !isBefore(parseISO(entry.backupExpiresAt), now);
}

export function shouldHardDeleteFromCloud(entry: TrashLifecycle, now = new Date()): boolean {
  return isBefore(parseISO(entry.cloudHardDeleteAt), now);
}

export function filterActiveTrash(entries: TrashLifecycle[], now = new Date()): TrashLifecycle[] {
  return entries.filter((e) => isVisibleInTrashUI(e, now) && !e.restoredAt);
}

export function filterRestorableTrash(entries: TrashLifecycle[], now = new Date()): TrashLifecycle[] {
  return entries.filter((e) => canRestoreFromBackup(e, now));
}
