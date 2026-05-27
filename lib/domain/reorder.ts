import type { SubjectFolder } from './types';

export function insertSubjectFolderAt(
  subjects: SubjectFolder[],
  activeId: string,
  insertIndex: number
): SubjectFolder[] {
  const sorted = [...subjects].sort((a, b) => a.sortOrder - b.sortOrder);
  const fromIdx = sorted.findIndex((s) => s.id === activeId);
  if (fromIdx < 0) return subjects;

  let targetIdx = Math.max(0, Math.min(insertIndex, sorted.length));
  const next = [...sorted];
  const [removed] = next.splice(fromIdx, 1);
  if (fromIdx < targetIdx) targetIdx -= 1;
  next.splice(targetIdx, 0, removed!);
  return next.map((s, i) => ({ ...s, sortOrder: i }));
}

export function reorderSubjectFolders(
  subjects: SubjectFolder[],
  activeId: string,
  overId: string
): SubjectFolder[] {
  const sorted = [...subjects].sort((a, b) => a.sortOrder - b.sortOrder);
  const fromIdx = sorted.findIndex((s) => s.id === activeId);
  const toIdx = sorted.findIndex((s) => s.id === overId);
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return subjects;

  const next = [...sorted];
  const [removed] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, removed!);
  return next.map((s, i) => ({ ...s, sortOrder: i }));
}

export function reorderItemKeys(keys: string[], activeKey: string, overKey: string): string[] {
  const fromIdx = keys.indexOf(activeKey);
  const toIdx = keys.indexOf(overKey);
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return keys;

  const next = [...keys];
  const [removed] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, removed!);
  return next;
}

export function mergeItemOrder(existing: string[] | undefined, keys: string[]): string[] {
  const kept = (existing ?? []).filter((k) => keys.includes(k));
  for (const k of keys) {
    if (!kept.includes(k)) kept.push(k);
  }
  return kept;
}
