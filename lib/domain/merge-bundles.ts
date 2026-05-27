import { mergeItemOrder } from '@/lib/domain/reorder';
import type { AppData, NoteBundle, NotePage } from '@/lib/domain/types';

/** Merge source bundle pages into target; source bundle is removed. Works across subjects. */
export function mergeBundlesIntoTarget(
  data: AppData,
  sourceBundleId: string,
  targetBundleId: string,
  title: string
): AppData {
  const source = data.bundles.find((b) => b.id === sourceBundleId && !b.archived);
  const target = data.bundles.find((b) => b.id === targetBundleId && !b.archived);
  if (!source || !target || source.id === target.id) return data;

  const trimmed = title.trim();
  const now = new Date().toISOString();
  const baseIndex = target.pages.length;

  const movedPages: NotePage[] = source.pages.map((page, i) => ({
    ...page,
    bundleId: target.id,
    sortIndex: baseIndex + i,
    updatedAt: now,
  }));

  const mergedPages = [...target.pages, ...movedPages].map((page, i) => ({
    ...page,
    sortIndex: i,
  }));

  const mergedBundle: NoteBundle = {
    ...target,
    title: trimmed || target.title,
    pageIds: mergedPages.map((p) => p.id),
    pages: mergedPages,
    updatedAt: now,
  };

  const newKeys = mergedPages.map((p) => `${target.id}:${p.id}`);

  const subjects = data.subjects.map((s) => {
    let order = [...(s.itemOrder ?? [])];
    order = order.filter((k) => !k.startsWith(`${source.id}:`));
    if (s.id === target.subjectId) {
      order = mergeItemOrder(order, newKeys);
    }
    return { ...s, itemOrder: order };
  });

  return {
    ...data,
    subjects,
    bundles: data.bundles
      .filter((b) => b.id !== sourceBundleId)
      .map((b) => (b.id === target.id ? mergedBundle : b)),
  };
}
