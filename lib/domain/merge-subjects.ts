import { mergeItemOrder } from '@/lib/domain/reorder';
import type { AppData } from '@/lib/domain/types';

function collectItemKeys(data: AppData, subjectId: string): string[] {
  const keys: string[] = [];
  for (const bundle of data.bundles) {
    if (bundle.subjectId !== subjectId || bundle.archived) continue;
    for (const page of bundle.pages) {
      keys.push(`${bundle.id}:${page.id}`);
    }
  }
  return keys;
}

/** Merge source subject into target; renames target and moves all bundles. */
export function mergeSubjectFoldersInData(
  data: AppData,
  targetId: string,
  sourceId: string,
  mergedName: string
): AppData | null {
  if (targetId === sourceId) return null;
  const target = data.subjects.find((s) => s.id === targetId);
  const source = data.subjects.find((s) => s.id === sourceId);
  if (!target || !source) return null;

  const name = mergedName.trim();
  if (!name) return null;

  const mergedOrder = mergeItemOrder(
    mergeItemOrder(target.itemOrder, collectItemKeys(data, targetId)),
    collectItemKeys(data, sourceId)
  );

  const bundles = data.bundles.map((b) =>
    b.subjectId === sourceId ? { ...b, subjectId: targetId } : b
  );

  const subjects = data.subjects
    .filter((s) => s.id !== sourceId)
    .map((s) => (s.id === targetId ? { ...s, name, itemOrder: mergedOrder } : s))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s, i) => ({ ...s, sortOrder: i }));

  return { ...data, subjects, bundles };
}

export function defaultMergedSubjectName(targetName: string, sourceName: string): string {
  const a = targetName.trim();
  const b = sourceName.trim();
  if (!a) return b;
  if (!b || a === b) return a;
  return `${a} · ${b}`;
}
