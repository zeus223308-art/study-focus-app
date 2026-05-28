import { theme } from '@/constants/theme';
import { HIGHLIGHTER_TOOLS, PEN_TOOLS } from '@/lib/domain/defaults';
import type { InkStroke, InkToolId } from '@/lib/domain/types';

export type InkStrokeStyle = { color: string; width: number; opacity: number };

export const INK_STROKE_STYLES: Record<InkToolId, InkStrokeStyle> = {
  'pen-black': { color: '#000000', width: 2, opacity: 1 },
  'pen-white': { color: '#FFFFFF', width: 2, opacity: 1 },
  'pen-red': { color: '#DC2626', width: 2, opacity: 1 },
  'pen-blue': { color: '#2563EB', width: 2, opacity: 1 },
  'hi-yellow': { color: '#FFE600', width: 12, opacity: 0.45 },
  'hi-green': { color: '#4ADE80', width: 12, opacity: 0.4 },
  'hi-pink': { color: '#F472B6', width: 12, opacity: 0.4 },
  eraser: { color: theme.grayLight, width: 24, opacity: 0.35 },
};

for (const p of PEN_TOOLS) {
  INK_STROKE_STYLES[p.id].width = p.width;
}
for (const h of HIGHLIGHTER_TOOLS) {
  INK_STROKE_STYLES[h.id].color = h.color;
  INK_STROKE_STYLES[h.id].width = h.width;
  INK_STROKE_STYLES[h.id].opacity = h.opacity ?? INK_STROKE_STYLES[h.id].opacity;
}

export function styleForStroke(stroke: InkStroke): InkStrokeStyle {
  return INK_STROKE_STYLES[stroke.tool];
}
