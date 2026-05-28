import type { InkToolId } from '@/lib/domain/types';

/** Single source of truth for pen ink colors (UI + stroke rendering). */
export const PEN_INK_COLORS: Record<
  'pen-black' | 'pen-white' | 'pen-red' | 'pen-blue',
  string
> = {
  'pen-black': '#000000',
  'pen-white': '#FFFFFF',
  'pen-red': '#DC2626',
  'pen-blue': '#2563EB',
};

export const PEN_INK_ORDER: Array<'pen-black' | 'pen-white' | 'pen-red' | 'pen-blue'> = [
  'pen-black',
  'pen-white',
  'pen-red',
  'pen-blue',
];

export function getPenInkColor(tool: InkToolId): string {
  if (tool === 'pen-black') return PEN_INK_COLORS['pen-black'];
  if (tool === 'pen-white') return PEN_INK_COLORS['pen-white'];
  if (tool === 'pen-red') return PEN_INK_COLORS['pen-red'];
  if (tool === 'pen-blue') return PEN_INK_COLORS['pen-blue'];
  return PEN_INK_COLORS['pen-black'];
}

export function getPenStrokeStyle(
  tool: InkToolId,
  width: number,
  opacity = 1
): { color: string; width: number; opacity: number } {
  return {
    color: getPenInkColor(tool),
    width,
    opacity,
  };
}
