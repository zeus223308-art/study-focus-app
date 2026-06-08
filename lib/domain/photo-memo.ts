import type { InkStroke, NoteLayer, NotePage, PhotoMemo } from './types';

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

function hasVisibleInkStrokes(strokes: InkStroke[]): boolean {
  return strokes.some((s) => s.tool !== 'eraser' && s.points.length >= 2);
}

export function hasPhotoMemoContent(raw?: PhotoMemo | null): boolean {
  const memo = normalizePhotoMemo(raw);
  if (hasVisibleInkStrokes(memo.strokes)) return true;
  return memo.textBoxes.some((b) => b.text.trim().length > 0);
}

/** Ink saved on the photo layer before memo unification (front side only). */
export function mergedPhotoInkStrokes(
  memo?: PhotoMemo | null,
  legacyLayer?: NoteLayer | null
): InkStroke[] {
  const memoStrokes = normalizePhotoMemo(memo).strokes;
  const legacyStrokes = legacyLayer?.strokes ?? [];
  return [...legacyStrokes, ...memoStrokes];
}

export function photoMemoToInkLayer(memo: PhotoMemo, id = 'photo_memo_layer'): NoteLayer {
  const normalized = normalizePhotoMemo(memo);
  const now = normalized.updatedAt;
  return {
    id,
    studyDate: '',
    visible: true,
    strokes: normalized.strokes,
    scratchpadOffsetY: 0,
    scratchpadHeight: 0,
    note: '',
    createdAt: now,
    updatedAt: now,
  };
}

export function mergedPhotoInkLayer(
  memo?: PhotoMemo | null,
  legacyLayer?: NoteLayer | null
): NoteLayer {
  const base = photoMemoToInkLayer(normalizePhotoMemo(memo));
  return { ...base, strokes: mergedPhotoInkStrokes(memo, legacyLayer) };
}

export function hasPhotoSideInk(
  memo?: PhotoMemo | null,
  legacyLayer?: NoteLayer | null
): boolean {
  if (hasPhotoMemoContent(memo)) return true;
  return hasVisibleInkStrokes(legacyLayer?.strokes ?? []);
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
