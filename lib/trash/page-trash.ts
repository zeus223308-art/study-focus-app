import type { NoteBundle } from '@/lib/domain/types';

/** Single-page bundle snapshot for trash when one photo is deleted. */
export function bundleSnapshotForTrashedPage(
  bundle: NoteBundle,
  pageId: string
): NoteBundle | null {
  const page = bundle.pages.find((p) => p.id === pageId);
  if (!page) return null;
  return {
    ...bundle,
    pageIds: [page.id],
    pages: [page],
    updatedAt: new Date().toISOString(),
  };
}
