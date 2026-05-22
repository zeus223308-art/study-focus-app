import type { InkToolId } from './types';

/** Pen stroke widths (3 steps). */
export const PEN_WIDTHS = [2, 3.5, 5] as const;

/** Highlighter stroke widths (3 steps). */
export const HIGHLIGHTER_WIDTHS = [8, 12, 18] as const;

/** Eraser hit radius (4 steps). */
export const ERASER_WIDTHS = [16, 24, 32, 44] as const;

export function isHighlighterTool(id: InkToolId): boolean {
  return id.startsWith('hi-');
}

export function widthOptionsForTool(id: InkToolId): readonly number[] {
  if (id === 'eraser') return ERASER_WIDTHS;
  if (isHighlighterTool(id)) return HIGHLIGHTER_WIDTHS;
  return PEN_WIDTHS;
}

export function defaultWidthForTool(id: InkToolId): number {
  const opts = widthOptionsForTool(id);
  return opts[Math.floor(opts.length / 2)] ?? opts[0];
}
