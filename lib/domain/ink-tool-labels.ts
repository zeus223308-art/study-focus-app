import type { InkToolId } from './types';
import { isHighlighterTool } from './ink-sizes';

/** i18n key under `item.*` for each ink color / tool. */
export function inkToolLabelKey(id: InkToolId): string {
  switch (id) {
    case 'pen-black':
      return 'inkPenBlack';
    case 'pen-red':
      return 'inkPenRed';
    case 'pen-blue':
      return 'inkPenBlue';
    case 'hi-yellow':
      return 'inkHiYellow';
    case 'hi-green':
      return 'inkHiGreen';
    case 'hi-pink':
      return 'inkHiPink';
    case 'eraser':
      return 'inkEraser';
    default:
      return 'inkPenBlack';
  }
}

export type InkToolKind = 'pen' | 'highlighter' | 'eraser';

export function inkToolKind(id: InkToolId): InkToolKind {
  if (id === 'eraser') return 'eraser';
  if (isHighlighterTool(id)) return 'highlighter';
  return 'pen';
}
