import type { NoteBundle, NotePage } from '@/lib/domain/types';

export type BundleStack = {
  studyDate: string;
  bundles: NoteBundle[];
};

export function groupBundlesByDate(bundles: NoteBundle[], subjectId: string): BundleStack[] {
  const active = bundles.filter((b) => b.subjectId === subjectId && !b.archived);
  const map = new Map<string, NoteBundle[]>();
  for (const b of active) {
    const list = map.get(b.studyDate) ?? [];
    list.push(b);
    map.set(b.studyDate, list);
  }
  return Array.from(map.entries())
    .map(([studyDate, stack]) => ({
      studyDate,
      bundles: stack.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    }))
    .sort((a, b) => b.studyDate.localeCompare(a.studyDate));
}

export function totalPagesInBundle(bundle: NoteBundle): number {
  return bundle.pages.length;
}

/** One list row per problem (page). Same date can have many cards. */
export type SubjectProblemItem = {
  bundleId: string;
  pageId: string;
  bundle: NoteBundle;
  page: NotePage;
};

export function listSubjectProblems(bundles: NoteBundle[], subjectId: string): SubjectProblemItem[] {
  const items: SubjectProblemItem[] = [];
  for (const bundle of bundles) {
    if (bundle.subjectId !== subjectId || bundle.archived) continue;
    for (const page of [...bundle.pages].sort((a, b) => a.sortIndex - b.sortIndex)) {
      items.push({ bundleId: bundle.id, pageId: page.id, bundle, page });
    }
  }
  return items.sort((a, b) => a.page.createdAt.localeCompare(b.page.createdAt));
}

export function searchBundles(bundles: NoteBundle[], query: string, examOnly?: boolean): NoteBundle[] {
  const q = query.trim().toLowerCase();
  return bundles.filter((b) => {
    if (b.archived) return false;
    if (examOnly && !b.pages.some((p) => p.tags.includes('exam'))) return false;
    if (!q) return true;
    const inTitle = b.title.toLowerCase().includes(q);
    const inPages = b.pages.some(
      (p) =>
        p.textNote.toLowerCase().includes(q) ||
        p.ocrText.toLowerCase().includes(q) ||
        p.answerOcrText.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
    return inTitle || inPages;
  });
}
