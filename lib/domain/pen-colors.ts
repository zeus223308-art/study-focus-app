import type { InkToolId, PenToolId } from '@/lib/domain/types';

/** Canonical pen ink colors (hex — used by canvas, SVG, and swatches). */
export const PEN_INK_COLORS: Record<PenToolId, string> = {
  'pen-black': '#000000',
  'pen-white': '#FFFFFF',
  'pen-red': '#DC2626',
  'pen-blue': '#2563EB',
};

export const PEN_INK_ORDER: PenToolId[] = ['pen-black', 'pen-white', 'pen-red', 'pen-blue'];

export function getPenInkColor(tool: InkToolId): string {
  if (tool === 'pen-black') return PEN_INK_COLORS['pen-black'];
  if (tool === 'pen-white') return PEN_INK_COLORS['pen-white'];
  if (tool === 'pen-red') return PEN_INK_COLORS['pen-red'];
  if (tool === 'pen-blue') return PEN_INK_COLORS['pen-blue'];
  return PEN_INK_COLORS['pen-black'];
}

export function strokeColorForTool(tool: InkToolId): string {
  return getPenInkColor(tool);
}

export function getPenStrokeStyle(
  tool: InkToolId,
  width: number,
  opacity = 1
): { color: string; width: number; opacity: number } {
  return {
    color: strokeColorForTool(tool),
    width,
    opacity,
  };
}
