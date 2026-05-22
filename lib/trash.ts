import { addDays, isBefore, parseISO } from 'date-fns';

import type { TrashEntry } from './types';

const TRASH_AUTO_DELETE_DAYS = 1;
const TRASH_BACKUP_CUTOFF_DAYS = 3;

export function shouldAutoDeleteFromTrash(entry: TrashEntry, now = new Date()): boolean {
  const deleted = parseISO(entry.deletedAt);
  return isBefore(addDays(deleted, TRASH_AUTO_DELETE_DAYS), now);
}

export function canRestoreFromTrash(entry: TrashEntry, now = new Date()): boolean {
  const deleted = parseISO(entry.deletedAt);
  return !isBefore(addDays(deleted, TRASH_BACKUP_CUTOFF_DAYS), now);
}
