import { movePageToSubject } from '@/lib/domain/move-page-to-subject';
import type { AppData } from '@/lib/domain/types';

export type PageRef = { bundleId: string; pageId: string };

function findBundleForPage(data: AppData, pageId: string, hintBundleId?: string) {
  if (hintBundleId) {
    const byHint = data.bundles.find((b) => b.id === hintBundleId && !b.archived);
    if (byHint?.pages.some((p) => p.id === pageId)) return byHint;
  }
  return data.bundles.find((b) => !b.archived && b.pages.some((p) => p.id === pageId));
}

/** Move multiple pages into an existing subject (sequential; handles bundle splits). */
export function movePagesToSubject(
  data: AppData,
  items: PageRef[],
  targetSubjectId: string
): AppData | null {
  if (items.length === 0) return data;
  let current = data;
  for (const item of items) {
    const bundle = findBundleForPage(current, item.pageId, item.bundleId);
    if (!bundle) continue;
    const next = movePageToSubject(current, bundle.id, item.pageId, targetSubjectId);
    if (!next) return null;
    current = next;
  }
  return current;
}
