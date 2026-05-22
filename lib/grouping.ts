import type { StudyItem } from './types';

export type DateStack = {
  studyDate: string;
  items: StudyItem[];
};

export function groupItemsByDate(items: StudyItem[]): DateStack[] {
  const map = new Map<string, StudyItem[]>();
  for (const item of items) {
    const list = map.get(item.studyDate) ?? [];
    list.push(item);
    map.set(item.studyDate, list);
  }
  return Array.from(map.entries())
    .map(([studyDate, stackItems]) => ({
      studyDate,
      items: stackItems.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }))
    .sort((a, b) => b.studyDate.localeCompare(a.studyDate));
}

export function searchItems(
  items: StudyItem[],
  query: string,
  options?: { folderId?: string; tag?: string; examOnly?: boolean }
): StudyItem[] {
  const q = query.trim().toLowerCase();
  return items.filter((item) => {
    if (options?.folderId && item.folderId !== options.folderId) return false;
    if (options?.examOnly && !item.tags.includes('exam')) return false;
    if (options?.tag && !item.tags.includes(options.tag)) return false;
    if (!q) return true;
    const inNote = item.textNote.toLowerCase().includes(q);
    const inTags = item.tags.some((t) => t.toLowerCase().includes(q));
    const inOcr = (item as StudyItem & { ocrText?: string }).ocrText?.toLowerCase().includes(q);
    return inNote || inTags || inOcr;
  });
}
