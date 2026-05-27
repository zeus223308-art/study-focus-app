import type { NotePage, TrashLifecycle } from '@/lib/domain/types';

import { filterActiveTrash, isTrashEntryWithPhotos } from '@/lib/trash/lifecycle';
import { subjectIdFromTrashEntry, subjectNameFromTrashEntry } from '@/lib/trash/subject-trash';

export type SubjectTrashGroup = {
  subjectId: string;
  subjectName: string;
  entries: TrashLifecycle[];
  pages: NotePage[];
  deletedAt: string;
};

export function groupTrashBySubject(
  entries: TrashLifecycle[],
  now = new Date(),
  subjects?: { id: string; name: string }[]
): SubjectTrashGroup[] {
  const visible = filterActiveTrash(entries, now);
  const map = new Map<string, SubjectTrashGroup>();

  for (const entry of visible) {
    const subjectId = subjectIdFromTrashEntry(entry);
    const subjectName = subjectNameFromTrashEntry(entry, subjects);
    let group = map.get(subjectId);
    if (!group) {
      group = {
        subjectId,
        subjectName,
        entries: [],
        pages: [],
        deletedAt: entry.deletedAt,
      };
      map.set(subjectId, group);
    }
    group.entries.push(entry);
    if (entry.deletedAt > group.deletedAt) {
      group.deletedAt = entry.deletedAt;
    }
    if (isTrashEntryWithPhotos(entry)) {
      for (const page of entry.bundleSnapshot.pages) {
        group.pages.push(page);
      }
    }
  }

  return [...map.values()].sort(
    (a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
  );
}
