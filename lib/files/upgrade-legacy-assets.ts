import * as ImageManipulator from 'expo-image-manipulator';

import type { AppData, CloudAsset, NotePage } from '@/lib/domain/types';
import { resolveImageUri } from '@/lib/files/resolve-image-uri';
import { ASSET_QUALITY_VERSION, THUMB_MAX_EDGE } from '@/lib/files/image-quality';
import {
  assetNeedsDerivativeRegeneration,
  regenerateDerivativesFromMaster,
} from '@/lib/files/regenerate-derivatives';
import {
  createMiniThumbnail,
  persistOriginalCopy,
} from '@/services/storage/asset-pipeline';

export type PhotoQualityUpgradeResult = {
  data: AppData;
  upgraded: number;
  unchanged: number;
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

function candidateUris(asset: CloudAsset): string[] {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const uri of [asset.originalLocalUri, asset.localMiniUri, asset.thumbnailUri]) {
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    list.push(uri);
  }
  return list;
}

async function pickBestSourceUri(asset: CloudAsset): Promise<string | null> {
  const candidates = candidateUris(asset);
  if (!candidates.length) return null;

  let best = candidates[0];
  let bestEdge = await probeLongEdge(best);
  for (let i = 1; i < candidates.length; i += 1) {
    const uri = candidates[i];
    const edge = await probeLongEdge(uri);
    if (edge > bestEdge) {
      best = uri;
      bestEdge = edge;
    }
  }
  return bestEdge > 0 ? best : null;
}

export async function assetNeedsQualityUpgrade(asset: CloudAsset): Promise<boolean> {
  const source = await pickBestSourceUri(asset);
  if (!source) return false;

  const sourceEdge = await probeLongEdge(source);
  if (sourceEdge <= 0) return false;

  const thumbEdge = await probeLongEdge(asset.thumbnailUri);
  const miniEdge = asset.localMiniUri ? await probeLongEdge(asset.localMiniUri) : 0;
  const masterEdge = asset.originalLocalUri ? await probeLongEdge(asset.originalLocalUri) : 0;

  const duplicateMini =
    !asset.localMiniUri ||
    asset.localMiniUri === asset.thumbnailUri ||
    (miniEdge > 0 && miniEdge <= thumbEdge + 16);

  const lowThumb = thumbEdge > 0 && thumbEdge < THUMB_MAX_EDGE * 0.82 && sourceEdge > thumbEdge + 64;
  const lowMini =
    duplicateMini && sourceEdge > Math.max(thumbEdge, miniEdge) + 64;
  const lowMaster =
    masterEdge > 0 && masterEdge < sourceEdge - 96 && sourceEdge > masterEdge;
  const missingMaster = !asset.originalLocalUri && sourceEdge > thumbEdge + 64;

  return lowThumb || lowMini || lowMaster || missingMaster;
}

export async function upgradeCloudAsset(
  asset: CloudAsset,
  bundleId: string,
  pageId: string
): Promise<{ asset: CloudAsset; changed: boolean }> {
  if (await assetNeedsDerivativeRegeneration(asset, bundleId, pageId)) {
    const regen = await regenerateDerivativesFromMaster(asset, bundleId, pageId);
    if (regen.changed) return { asset: regen.asset, changed: true };
    if (!regen.failed && !(await assetNeedsQualityUpgrade(asset))) {
      return { asset: regen.asset, changed: false };
    }
  }

  if (!(await assetNeedsQualityUpgrade(asset))) {
    return { asset, changed: false };
  }

  const bestSource = await pickBestSourceUri(asset);
  if (!bestSource) return { asset, changed: false };

  try {
    const masterUri = await persistOriginalCopy(bestSource, bundleId, pageId);
    const thumb = await createMiniThumbnail(masterUri, bundleId, pageId);
    const next: CloudAsset = {
      ...asset,
      originalLocalUri: masterUri,
      thumbnailUri: thumb.thumbnailUri,
      localMiniUri: thumb.localMiniUri,
      syncStatus:
        asset.syncStatus === 'synced' || asset.syncStatus === 'pending_upload'
          ? 'pending_upload'
          : asset.syncStatus,
    };
    return { asset: next, changed: true };
  } catch {
    return { asset, changed: false };
  }
}

async function upgradePage(page: NotePage): Promise<{
  page: NotePage;
  upgraded: number;
  unchanged: number;
  failed: number;
}> {
  let upgraded = 0;
  let unchanged = 0;
  let failed = 0;

  try {
    const front = await upgradeCloudAsset(page.asset, page.bundleId, page.id);
    if (front.changed) upgraded += 1;
    else unchanged += 1;
    let answerAsset = page.answerAsset;
    if (page.answerAsset) {
      const back = await upgradeCloudAsset(
        page.answerAsset,
        page.bundleId,
        `${page.id}_back`
      );
      answerAsset = back.asset;
      if (back.changed) upgraded += 1;
      else unchanged += 1;
    }
    return {
      page: { ...page, asset: front.asset, answerAsset },
      upgraded,
      unchanged,
      failed,
    };
  } catch {
    return { page, upgraded: 0, unchanged: 0, failed: 1 };
  }
}

export async function upgradeLegacyPhotoQuality(
  data: AppData,
  options?: { force?: boolean }
): Promise<PhotoQualityUpgradeResult> {
  const force = options?.force === true;
  const version = data.settings.assetQualityVersion ?? 0;
  if (!force && version >= ASSET_QUALITY_VERSION) {
    return { data, upgraded: 0, unchanged: 0, failed: 0 };
  }

  let upgraded = 0;
  let unchanged = 0;
  let failed = 0;

  const bundles = [];
  for (const bundle of data.bundles) {
    const pages = [];
    for (const page of bundle.pages) {
      const result = await upgradePage(page);
      pages.push(result.page);
      upgraded += result.upgraded;
      unchanged += result.unchanged;
      failed += result.failed;
    }
    bundles.push({ ...bundle, pages });
  }

  const trash = [];
  for (const entry of data.trash) {
    const pages = [];
    for (const page of entry.bundleSnapshot.pages) {
      const result = await upgradePage(page);
      pages.push(result.page);
      upgraded += result.upgraded;
      unchanged += result.unchanged;
      failed += result.failed;
    }
    trash.push({
      ...entry,
      bundleSnapshot: { ...entry.bundleSnapshot, pages },
    });
  }

  return {
    data: {
      ...data,
      bundles,
      trash,
      settings: {
        ...data.settings,
        assetQualityVersion: ASSET_QUALITY_VERSION,
      },
    },
    upgraded,
    unchanged,
    failed,
  };
}

/** Rough cap so UI can warn before a long batch. */
export function estimateUpgradeableAssets(data: AppData): number {
  let n = 0;
  const countBundle = (pages: NotePage[]) => {
    for (const page of pages) {
      n += 1;
      if (page.answerAsset) n += 1;
    }
  };
  for (const b of data.bundles) countBundle(b.pages);
  for (const t of data.trash) countBundle(t.bundleSnapshot.pages);
  return n;
}
