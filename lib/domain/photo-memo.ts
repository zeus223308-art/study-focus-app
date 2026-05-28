import type { PhotoMemo } from './types';

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
