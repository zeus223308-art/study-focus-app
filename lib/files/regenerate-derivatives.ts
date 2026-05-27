import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

import type { AppData, CloudAsset, NotePage } from '@/lib/domain/types';
import { ensureCanonicalMasterUri, uriIsReadable } from '@/lib/files/asset-uri-utils';
import { isStaleWebBlobUri, resolveImageUri } from '@/lib/files/resolve-image-uri';
import { THUMB_MAX_EDGE } from '@/lib/files/image-quality';
import { createMiniThumbnail } from '@/services/storage/asset-pipeline';

export type DerivativeRegenResult = {
  data: AppData;
  regenerated: number;
  skipped: number;
  failed: number;
};

async function probeLongEdge(uri: string): Promise<number> {
  try {
    const resolved = (await resolveImageUri(uri)) ?? uri;
    const probe = await ImageManipulator.manipulateAsync(resolved, [], {
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return Math.max(probe.width ?? 0, probe.height ?? 0);
  } catch {
    return 0;
  }
}

async function resolveMasterUri(
  asset: CloudAsset,
  bundleId: string,
  pageId: string
): Promise<string | null> {
  const ensured = await ensureCanonicalMasterUri(asset, bundleId, pageId, 'master');
  if (ensured) return ensured;

  if (
    asset.originalLocalUri &&
    !isStaleWebBlobUri(asset.originalLocalUri) &&
    (await uriIsReadable(asset.originalLocalUri))
  ) {
    return asset.originalLocalUri;
  }

  for (const uri of [asset.localMiniUri, asset.thumbnailUri]) {
    if (uri && (await uriIsReadable(uri))) {
      const edge = await probeLongEdge(uri);
      if (edge > THUMB_MAX_EDGE * 0.5) return uri;
    }
  }
  return null;
}

export async function assetNeedsDerivativeRegeneration(
  asset: CloudAsset,
  bundleId: string,
  pageId: string
): Promise<boolean> {
  const master = await resolveMasterUri(asset, bundleId, pageId);
  if (!master) return false;

  const masterEdge = await probeLongEdge(master);
  if (masterEdge <= 0) return false;

  const thumbOk =
    asset.thumbnailUri &&
    (await uriIsReadable(asset.thumbnailUri)) &&
    (await probeLongEdge(asset.thumbnailUri)) >= Math.min(THUMB_MAX_EDGE * 0.75, masterEdge * 0.35);

  const miniOk =
    asset.localMiniUri &&
    asset.localMiniUri !== asset.thumbnailUri &&
    (await uriIsReadable(asset.localMiniUri));

  return !thumbOk || !miniOk;
}

export async function regenerateDerivativesFromMaster(
  asset: CloudAsset,
  bundleId: string,
  pageId: string
): Promise<{ asset: CloudAsset; changed: boolean; failed: boolean }> {
  try {
    const master = await resolveMasterUri(asset, bundleId, pageId);
    if (!master) {
      return { asset, changed: false, failed: false };
    }

    if (!(await assetNeedsDerivativeRegeneration(asset, bundleId, pageId))) {
      return { asset, changed: false, failed: false };
    }

    const resolvedMaster = (await resolveImageUri(master)) ?? master;
    const thumb = await createMiniThumbnail(resolvedMaster, bundleId, pageId);

    const next: CloudAsset = {
      ...asset,
      originalLocalUri: asset.originalLocalUri ?? master,
      thumbnailUri: thumb.thumbnailUri,
      localMiniUri: thumb.localMiniUri,
      syncStatus:
        asset.syncStatus === 'synced' || asset.syncStatus === 'pending_upload'
          ? 'pending_upload'
          : asset.syncStatus,
    };

    const thumbReadable = await uriIsReadable(next.thumbnailUri);
    if (!thumbReadable) {
      return { asset, changed: false, failed: true };
    }

    return { asset: next, changed: true, failed: false };
  } catch {
    return { asset, changed: false, failed: true };
  }
}

async function regenPage(page: NotePage): Promise<{
  page: NotePage;
  regenerated: number;
  skipped: number;
  failed: number;
}> {
  let regenerated = 0;
  let skipped = 0;
  let failed = 0;

  const front = await regenerateDerivativesFromMaster(page.asset, page.bundleId, page.id);
  if (front.failed) failed += 1;
  else if (front.changed) regenerated += 1;
  else skipped += 1;

  let answerAsset = page.answerAsset;
  if (page.answerAsset) {
    const back = await regenerateDerivativesFromMaster(
      page.answerAsset,
      page.bundleId,
      `${page.id}_back`
    );
    answerAsset = back.asset;
    if (back.failed) failed += 1;
    else if (back.changed) regenerated += 1;
    else skipped += 1;
  }

  return {
    page: { ...page, asset: front.asset, answerAsset },
    regenerated,
    skipped,
    failed,
  };
}

export async function ensureAppDataDerivatives(data: AppData): Promise<DerivativeRegenResult> {
  let regenerated = 0;
  let skipped = 0;
  let failed = 0;

  const bundles = [];
  for (const bundle of data.bundles) {
    const pages = [];
    for (const page of bundle.pages) {
      const result = await regenPage(page);
      pages.push(result.page);
      regenerated += result.regenerated;
      skipped += result.skipped;
      failed += result.failed;
    }
    bundles.push({ ...bundle, pages });
  }

  const trash = [];
  for (const entry of data.trash) {
    const pages = [];
    for (const page of entry.bundleSnapshot.pages) {
      const result = await regenPage(page);
      pages.push(result.page);
      regenerated += result.regenerated;
      skipped += result.skipped;
      failed += result.failed;
    }
    trash.push({
      ...entry,
      bundleSnapshot: { ...entry.bundleSnapshot, pages },
    });
  }

  return { data: { ...data, bundles, trash }, regenerated, skipped, failed };
}
