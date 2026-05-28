import type { PenToolId } from '@/lib/domain/types';

/**
 * 1×1 RGB PNG data URIs (generated programmatically — exact #000 / #fff).
 * Previous placeholder PNGs rendered red / yellow on mobile web.
 */
export const PEN_SWATCH_DATA_URI: Partial<Record<PenToolId, string>> = {
  'pen-black':
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNgYGAAAAAEAAH2FzhVAAAAAElFTkSuQmCC',
  'pen-white':
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC',
};
