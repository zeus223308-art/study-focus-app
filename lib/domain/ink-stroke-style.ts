import type { InkStroke, InkToolId } from '@/lib/domain/types';

import { getPenInkColor, getPenStrokeStyle } from '@/lib/domain/pen-colors';

export type InkStrokeStyle = { color: string; width: number; opacity: number };

export const INK_STROKE_STYLES: Record<InkToolId, InkStrokeStyle> = {
  'pen-black': { color: getPenInkColor('pen-black'), width: 2, opacity: 1 },
  'pen-white': { color: getPenInkColor('pen-white'), width: 2, opacity: 1 },
  'pen-red': { color: getPenInkColor('pen-red'), width: 2, opacity: 1 },
  'pen-blue': { color: getPenInkColor('pen-blue'), width: 2, opacity: 1 },
  'hi-yellow': { color: '#FFE600', width: 12, opacity: 0.45 },
  'hi-green': { color: '#4ADE80', width: 12, opacity: 0.4 },
  'hi-pink': { color: '#F472B6', width: 12, opacity: 0.4 },
  eraser: { color: '#888888', width: 24, opacity: 0.35 },
};

export function strokeStyleForTool(tool: InkToolId, width: number): InkStrokeStyle {
  if (tool === 'pen-black' || tool === 'pen-white' || tool === 'pen-red' || tool === 'pen-blue') {
    return getPenStrokeStyle(tool, width);
  }
  const base = INK_STROKE_STYLES[tool];
  return { ...base, width };
}

export function styleForStroke(stroke: InkStroke): InkStrokeStyle {
  const tool = stroke.tool;
  if (tool === 'pen-black' || tool === 'pen-white' || tool === 'pen-red' || tool === 'pen-blue') {
    return getPenStrokeStyle(tool, stroke.width, stroke.opacity);
  }
  return { ...INK_STROKE_STYLES[tool], width: stroke.width, opacity: stroke.opacity };
}
