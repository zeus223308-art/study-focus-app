import { theme } from '@/constants/theme';
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

export function styleForStroke(stroke: InkStroke): InkStrokeStyle {
  return INK_STROKE_STYLES[stroke.tool];
}
