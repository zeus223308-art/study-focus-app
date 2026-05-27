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

/** Lighter URI for grids — ResolvedImage tries all candidates when this one fails. */
export function getPreviewImageUri(asset: CloudAsset | null | undefined): string | null {
  if (!asset) return null;
  return getPreviewUriCandidates(asset)[0] ?? null;
}
