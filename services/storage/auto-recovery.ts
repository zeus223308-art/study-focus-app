import type { AppData } from '@/lib/domain/types';
import { forcePullDriveBackup } from '@/services/cloud/drive-sync';
import { getValidAccessToken } from '@/services/cloud/google-session';

import { countAppPages, hasRecoverableContent } from './data-safety';
import { currentAppVersion, readRecoveryManifest, shouldAttemptAutoRecovery } from './recovery-manifest';
import { getActiveAccountEmail, isGuestSession } from './storage-scope';
import type { StorageProvider } from './types';

export type AutoRecoverySource = 'local' | 'drive';

export type AutoRecoveryResult = {
  data: AppData;
  recovered: boolean;
  source: AutoRecoverySource | null;
};

export async function stampRecoverySettings(data: AppData): Promise<AppData> {
  const pages = countAppPages(data);
  const version = currentAppVersion();
  const email = await getActiveAccountEmail();

  return {
    ...data,
    settings: {
      ...data.settings,
      cloudAccountEmail: email ?? data.settings.cloudAccountEmail,
      hadStudyContent: data.settings.hadStudyContent || pages > 0,
      lastSavedPageCount: pages > 0 ? pages : data.settings.lastSavedPageCount,
      lastSavedAt: pages > 0 ? new Date().toISOString() : data.settings.lastSavedAt,
      lastAppVersion: version,
      lastAutoRecoveryAt: data.settings.lastAutoRecoveryAt,
    },
  };
}

/** Local / legacy only — Drive files are already scoped by OAuth token. */
export async function dataMatchesActiveAccount(data: AppData): Promise<boolean> {
  const active = await getActiveAccountEmail();
  const owner = data.settings.cloudAccountEmail?.trim().toLowerCase() ?? null;
  if (!active) return !owner;
  if (!owner) return true;
  return owner === active;
}

/**
 * Per-account scoped storage is already partitioned by email.
 * Stamp the active account and keep bundles (do not wipe on stale cloudAccountEmail).
 */
export async function stampActiveAccountOnData(data: AppData): Promise<AppData> {
  const active = await getActiveAccountEmail();
  if (!active) return data;
  return {
    ...data,
    settings: { ...data.settings, cloudAccountEmail: active },
  };
}

/** Guest: reject foreign-owner snapshots. Signed-in: always accept scoped partition. */
export async function acceptLoadedAppData(data: AppData): Promise<AppData | null> {
  const active = await getActiveAccountEmail();
  if (active) return stampActiveAccountOnData(data);
  if (await dataMatchesActiveAccount(data)) return data;
  return null;
}

export async function detectAppUpdateWithEmptyData(data: AppData): Promise<boolean> {
  if (hasRecoverableContent(data)) return false;
  const version = currentAppVersion();
  const prev = data.settings.lastAppVersion;
  if (!prev || prev === version) return false;
  const manifest = await readRecoveryManifest();
  return Boolean(manifest?.hadStudyContent || data.settings.hadStudyContent);
}

export async function runAutoRecovery(
  storage: StorageProvider,
  current: AppData
): Promise<AutoRecoveryResult> {
  if (await isGuestSession()) {
    return { data: structuredClone(current), recovered: false, source: null };
  }

  const needsRecovery =
    (await shouldAttemptAutoRecovery(current)) || (await detectAppUpdateWithEmptyData(current));

  if (!needsRecovery) {
    return { data: await stampRecoverySettings(current), recovered: false, source: null };
  }

  const fromLocal = await storage.restoreLocalBackup();
  if (fromLocal && hasRecoverableContent(fromLocal) && (await dataMatchesActiveAccount(fromLocal))) {
    const stamped = await stampRecoverySettings({
      ...fromLocal,
      settings: {
        ...fromLocal.settings,
        lastAutoRecoveryAt: new Date().toISOString(),
        cloudBackupEnabled: fromLocal.settings.cloudBackupEnabled ?? true,
      },
    });
    await storage.saveAppData(stamped);
    return { data: stamped, recovered: true, source: 'local' };
  }

  const token = await getValidAccessToken();
  if (token) {
    const pulled = await forcePullDriveBackup(current);
    if (pulled.outcome.status === 'pulled' && hasRecoverableContent(pulled.data)) {
      const stamped = await stampRecoverySettings({
        ...pulled.data,
        settings: {
          ...pulled.data.settings,
          lastAutoRecoveryAt: new Date().toISOString(),
          cloudBackupEnabled: true,
        },
      });
      await storage.saveAppData(stamped);
      return { data: stamped, recovered: true, source: 'drive' };
    }
  }

  return { data: current, recovered: false, source: null };
}
