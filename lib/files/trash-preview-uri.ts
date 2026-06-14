import type { CloudAsset } from '@/lib/domain/types';

import {
  getFullUriCandidates,
  getPreviewUriCandidates,
} from '@/lib/files/asset-uri-utils';
import { toWebStoredUri, webAssetKey, type WebAssetRole } from '@/services/storage/web-asset-store';

const PREVIEW_ROLES: WebAssetRole[] = ['mini', 'thumb', 'master'];

function uniqueUris(uris: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of uris) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

/** Trash snapshots may hold stale blob URIs — always try canonical IndexedDB keys first. */
export function getTrashPreviewCandidates(
  bundleId: string,
  pageId: string,
  asset?: CloudAsset | null,
  preferPreview = true
): string[] {
  const canonical = PREVIEW_ROLES.map((role) => toWebStoredUri(webAssetKey(bundleId, pageId, role)));
  const fromAsset = asset
    ? preferPreview
      ? getPreviewUriCandidates(asset)
      : getFullUriCandidates(asset)
    : [];
  return uniqueUris([...canonical, ...fromAsset]);
}
