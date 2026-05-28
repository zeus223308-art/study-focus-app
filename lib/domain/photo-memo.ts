import type { NotePage, PhotoMemo } from './types';

export function emptyPhotoMemo(): PhotoMemo {
  return { strokes: [], textBoxes: [], updatedAt: new Date().toISOString() };
}

export function normalizePhotoMemo(raw?: PhotoMemo | null): PhotoMemo {
  if (!raw) return emptyPhotoMemo();
  return {
    strokes: Array.isArray(raw.strokes) ? raw.strokes : [],
    textBoxes: Array.isArray(raw.textBoxes) ? raw.textBoxes : [],
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}

export function hasPhotoMemoContent(raw?: PhotoMemo | null): boolean {
  const memo = normalizePhotoMemo(raw);
  if (memo.strokes.some((s) => s.tool !== 'eraser' && s.points.length >= 2)) return true;
  return memo.textBoxes.some((b) => b.text.trim().length > 0);
}

export function pageHasPhotoMemo(page: Pick<NotePage, 'frontMemo' | 'answerMemo'>): boolean {
  return hasPhotoMemoContent(page.frontMemo) || hasPhotoMemoContent(page.answerMemo);
}

/** Badge size for album grid tiles (scales with cell width). */
export function albumMemoBadgeMetrics(cellWidth: number) {
  const size = Math.max(12, Math.min(20, Math.round(cellWidth * 0.26)));
  const icon = Math.max(8, Math.round(size * 0.55));
  const inset = Math.max(2, Math.round(cellWidth * 0.04));
  return { size, icon, inset };
}
