import type { CloudAsset } from '@/lib/domain/types';

/** Prefer full master for study views; fall back to generated previews. */
export function getFullImageUri(asset: CloudAsset | null | undefined): string | null {
  if (!asset) return null;
  return asset.originalLocalUri ?? asset.localMiniUri ?? asset.thumbnailUri ?? null;
}

/** Lighter URI for grids (still prefers preview over tiny thumb when available). */
export function getPreviewImageUri(asset: CloudAsset | null | undefined): string | null {
  if (!asset) return null;
  return asset.localMiniUri ?? asset.originalLocalUri ?? asset.thumbnailUri ?? null;
}
