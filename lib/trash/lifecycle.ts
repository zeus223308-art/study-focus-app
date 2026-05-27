import { addDays, isBefore, parseISO } from 'date-fns';

import type { NoteBundle, SubjectFolder, TrashLifecycle } from '@/lib/domain/types';

export const TRASH_BACKUP_DAYS = 3;

let trashIdSeq = 0;

function nextTrashId(): string {
  trashIdSeq += 1;
  return `trash_${Date.now()}_${trashIdSeq}`;
}

export type TrashLifecycleOptions = {
  subjectSnapshot?: SubjectFolder;
};

export function createTrashLifecycle(
  bundle: NoteBundle,
  deletedAt = new Date(),
  options?: TrashLifecycleOptions
): TrashLifecycle {
  const deleted = deletedAt.toISOString();
  const expiresAt = addDays(deletedAt, TRASH_BACKUP_DAYS).toISOString();
  return {
    id: nextTrashId(),
    bundleId: bundle.id,
    bundleSnapshot: bundle,
    subjectSnapshot: options?.subjectSnapshot,
    deletedAt: deleted,
    uiExpiresAt: expiresAt,
    backupExpiresAt: expiresAt,
    cloudHardDeleteAt: expiresAt,
    restoredAt: null,
  };
}

/** Subject folder removed with no photo bundles — still restorable for 3 days. */
export function createSubjectOnlyTrashLifecycle(
  subject: SubjectFolder,
  deletedAt = new Date()
): TrashLifecycle {
  const deleted = deletedAt.toISOString();
  const expiresAt = addDays(deletedAt, TRASH_BACKUP_DAYS).toISOString();
  const placeholder: NoteBundle = {
    id: `__subject_trash__${subject.id}`,
    subjectId: subject.id,
    studyDate: deleted.slice(0, 10),
    title: '',
    pageIds: [],
    pages: [],
    archived: false,
    archivedAt: null,
    review: {
      reviewScheduleId: subject.reviewScheduleId,
      reviewAnchorDate: deleted.slice(0, 10),
      reviewStepIndex: 0,
      lastReviewedAt: null,
      nextReviewAt: null,
      aiScoreLast: null,
    },
    createdAt: deleted,
    updatedAt: deleted,
  };
  return {
    id: nextTrashId(),
    bundleId: placeholder.id,
    bundleSnapshot: placeholder,
    subjectSnapshot: subject,
    deletedAt: deleted,
    uiExpiresAt: expiresAt,
    backupExpiresAt: expiresAt,
    cloudHardDeleteAt: expiresAt,
    restoredAt: null,
  };
}

export function isTrashEntryWithPhotos(entry: TrashLifecycle): boolean {
  return entry.bundleSnapshot.pages.length > 0;
}

export function isVisibleInTrashUI(entry: TrashLifecycle, now = new Date()): boolean {
  if (entry.restoredAt) return false;
  return !isBefore(parseISO(entry.backupExpiresAt), now);
}

export function canRestoreFromBackup(entry: TrashLifecycle, now = new Date()): boolean {
  if (entry.restoredAt) return false;
  return !isBefore(parseISO(entry.backupExpiresAt), now);
}

export function shouldHardDeleteFromCloud(entry: TrashLifecycle, now = new Date()): boolean {
  return isBefore(parseISO(entry.cloudHardDeleteAt), now);
}

export function filterActiveTrash(entries: TrashLifecycle[], now = new Date()): TrashLifecycle[] {
  return entries.filter((e) => isVisibleInTrashUI(e, now));
}

export function filterRestorableTrash(entries: TrashLifecycle[], now = new Date()): TrashLifecycle[] {
  return entries.filter((e) => canRestoreFromBackup(e, now));
}
