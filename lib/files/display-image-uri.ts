import type { CloudAsset } from '@/lib/domain/types';
import {
  getFullUriCandidates,
  getPreviewUriCandidates,
} from '@/lib/files/asset-uri-utils';

/** Prefer full master for study views; fall back to generated previews. */
export function getFullImageUri(asset: CloudAsset | null | undefined): string | null {
  if (!asset) return null;
  return getFullUriCandidates(asset)[0] ?? null;
}

/** Uncropped source for crop editor / restore — before any saved crop. */
export function getUncroppedImageUri(asset: CloudAsset | null | undefined): string | null {
  if (!asset) return null;
  if (asset.uncroppedLocalUri) return asset.uncroppedLocalUri;
  return asset.originalLocalUri ?? asset.localMiniUri ?? asset.thumbnailUri ?? null;
}

/** Lighter URI for grids — ResolvedImage tries all candidates when this one fails. */
export function getPreviewImageUri(asset: CloudAsset | null | undefined): string | null {
  if (!asset) return null;
  return getPreviewUriCandidates(asset)[0] ?? null;
}
