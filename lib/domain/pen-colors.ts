import type { InkToolId, PenToolId } from '@/lib/domain/types';

/** Ink colors as rgb() — mobile web handles these more reliably than #000 / #fff. */
export const PEN_INK_COLORS: Record<PenToolId, string> = {
  'pen-black': 'rgb(0, 0, 0)',
  'pen-white': 'rgb(255, 255, 255)',
  'pen-red': 'rgb(220, 38, 38)',
  'pen-blue': 'rgb(37, 99, 235)',
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
