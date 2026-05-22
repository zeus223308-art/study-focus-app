import type { AppData, NoteBundle } from './types';

export type RemovePageResult = {
  data: AppData;
  /** Bundle removed entirely (last page or empty). */
  bundleRemoved: boolean;
  removedBundle: NoteBundle | null;
};

export function removePageFromData(
  data: AppData,
  bundleId: string,
  pageId: string
): RemovePageResult {
  const bundle = data.bundles.find((b) => b.id === bundleId);
  if (!bundle) {
    return { data, bundleRemoved: false, removedBundle: null };
  }

  const pages = bundle.pages.filter((p) => p.id !== pageId);
  if (pages.length === bundle.pages.length) {
    return { data, bundleRemoved: false, removedBundle: null };
  }

  if (pages.length === 0) {
    return {
      data: {
        ...data,
        bundles: data.bundles.filter((b) => b.id !== bundleId),
      },
      bundleRemoved: true,
      removedBundle: bundle,
    };
  }

  const reindexed = pages.map((p, i) => ({ ...p, sortIndex: i }));
  const updated: NoteBundle = {
    ...bundle,
    pageIds: reindexed.map((p) => p.id),
    pages: reindexed,
    updatedAt: new Date().toISOString(),
  };

  return {
    data: {
      ...data,
      bundles: data.bundles.map((b) => (b.id === bundleId ? updated : b)),
    },
    bundleRemoved: false,
    removedBundle: null,
  };
}
