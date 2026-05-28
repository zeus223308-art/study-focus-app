import type { PenToolId } from '@/lib/domain/types';

/** 1×1 PNG data URIs for black/white — immune to CSS forced-color on mobile web. */
export const PEN_SWATCH_DATA_URI: Partial<Record<PenToolId, string>> = {
  'pen-black':
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwDA8ABlqKAz7TxQAAAABJRU5ErkJggg==',
  'pen-white':
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
};
