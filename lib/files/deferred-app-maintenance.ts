import type { AppData } from '@/lib/domain/types';
import { ensureAppDataDerivatives } from '@/lib/files/regenerate-derivatives';
import { upgradeLegacyPhotoQuality } from '@/lib/files/upgrade-legacy-assets';

export type DeferredMaintenanceResult = {
  data: AppData;
  changed: boolean;
};

/**
 * Heavy thumbnail / quality passes — run after first paint, not during cold load.
 * Scanning hundreds of pages on startup can freeze or crash the app (Error 300 + Retry).
 */
export async function runDeferredAppMaintenance(data: AppData): Promise<DeferredMaintenanceResult> {
  const before = JSON.stringify(data.bundles);

  const derivatives = await ensureAppDataDerivatives(data);
  const quality = await upgradeLegacyPhotoQuality(derivatives.data);

  const next: AppData = {
    ...quality.data,
    settings: {
      ...quality.data.settings,
      lastDerivativeRegenAt: new Date().toISOString(),
      lastDerivativeRegenFailed: derivatives.failed,
    },
  };

  const changed =
    before !== JSON.stringify(next.bundles) ||
    derivatives.regenerated > 0 ||
    quality.upgraded > 0 ||
    derivatives.failed > 0 ||
    (next.settings.assetQualityVersion ?? 0) !== (data.settings.assetQualityVersion ?? 0);

  return { data: next, changed };
}
