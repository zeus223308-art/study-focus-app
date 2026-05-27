import type { AppData, TrashLifecycle } from '@/lib/domain/types';

import {
  createSubjectOnlyTrashLifecycle,
  createTrashLifecycle,
} from '@/lib/trash/lifecycle';

/** Build trash rows when one or more subject folders are deleted (snapshots kept 3 days). */
export function buildTrashEntriesForDeletedSubjects(
  data: AppData,
  subjectIds: string[],
  deletedAt = new Date()
): TrashLifecycle[] {
  const idSet = new Set(subjectIds);
  const subjects = data.subjects.filter((s) => idSet.has(s.id));
  const entries: TrashLifecycle[] = [];

  for (const subject of subjects) {
    const bundles = data.bundles.filter((b) => b.subjectId === subject.id);
    if (bundles.length === 0) {
      entries.push(createSubjectOnlyTrashLifecycle(subject, deletedAt));
      continue;
    }
    for (const bundle of bundles) {
      entries.push(createTrashLifecycle(bundle, deletedAt, { subjectSnapshot: subject }));
    }
  }

  return entries;
}

export function trashEntriesForSubject(
  trash: TrashLifecycle[],
  subjectId: string
): TrashLifecycle[] {
  return trash.filter(
    (e) => e.subjectSnapshot?.id === subjectId || e.bundleSnapshot.subjectId === subjectId
  );
}

export function subjectNameFromTrashEntry(entry: TrashLifecycle): string {
  return entry.subjectSnapshot?.name ?? entry.bundleSnapshot.subjectId;
}

export function subjectIdFromTrashEntry(entry: TrashLifecycle): string {
  return entry.subjectSnapshot?.id ?? entry.bundleSnapshot.subjectId;
}
