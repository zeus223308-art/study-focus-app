import AsyncStorage from '@react-native-async-storage/async-storage';



import { DEFAULT_DATA, DEFAULT_SCHEDULES } from '@/lib/domain/defaults';

import { normalizeAppSettings } from '@/lib/domain/dates';

import { normalizeFolderScheduleId } from '@/lib/domain/folder-schedule';

import type { AppData } from '@/lib/domain/types';

import { migratePersistedWebAssets } from '@/lib/files/migrate-web-assets';
import { repairAppDataAssets } from '@/lib/files/repair-loaded-assets';
import { ensureAppDataDerivatives } from '@/lib/files/regenerate-derivatives';
import { upgradeLegacyPhotoQuality } from '@/lib/files/upgrade-legacy-assets';

import { migrateToV4 } from '@/services/storage/migration';



import { acceptLoadedAppData, dataMatchesActiveAccount, stampRecoverySettings } from './auto-recovery';
import { clearGuestSession, getGuestSessionData, setGuestSessionData } from './guest-session';
import { hasRecoverableContent } from './data-safety';
import { readLocalBackupRaw, writeLocalBackupRaw } from './local-backup';
import { writeRecoveryManifest } from './recovery-manifest';

import type { StorageProvider, ThumbnailResult, UploadResult } from './types';

import { createMiniThumbnail } from './asset-pipeline';



import {
  APP_DATA_KEY_BASE,
  clearGuestScopedStorage,
  getActiveAccountEmail,
  getScopedAppDataKey,
  isGuestSession,
} from './storage-scope';



function mergeSchedulesFromDefaults(saved: AppData['schedules']): AppData['schedules'] {

  return DEFAULT_SCHEDULES.map((def) => {

    const row = saved.find((s) => s.id === def.id);

    return row ? { ...row, ...def } : def;

  });

}



function normalizePages(data: AppData): AppData['bundles'] {

  return data.bundles.map((b) => {

    const title =

      b.title.trim() === b.studyDate || !b.title.trim() ? '' : b.title.trim();

    return {

      ...b,

      title,

      pages: b.pages.map((p) => ({

        ...p,

        answerSlideshowSeconds: p.answerSlideshowSeconds ?? p.slideshowSeconds ?? 10,

      })),

    };

  });

}



function normalizeLoadedData(data: AppData): AppData {

  const active = data.settings.activeScheduleIds.filter((id) => id !== 'sched_2days');

  return {

    ...data,

    schedules: mergeSchedulesFromDefaults(data.schedules),

    subjects: data.subjects.map((s) => ({

      ...s,

      reviewScheduleId: normalizeFolderScheduleId(s.reviewScheduleId),

    })),

    bundles: normalizePages(data),

    settings: normalizeAppSettings(

      { ...data.settings, activeScheduleIds: active.length ? active : ['sched_135714', 'sched_daily'] },

      data

    ),

  };

}



function mergeParsedAppData(parsed: AppData): AppData {

  return {

    ...DEFAULT_DATA,

    ...parsed,

    settings: { ...DEFAULT_DATA.settings, ...parsed.settings },

    schedules: parsed.schedules?.length ? parsed.schedules : DEFAULT_DATA.schedules,

    subjects: parsed.subjects?.length ? parsed.subjects : DEFAULT_DATA.subjects,

  };

}



export class LocalStorageProvider implements StorageProvider {

  async loadAppData(): Promise<AppData> {
    if (await isGuestSession()) {
      const cached = getGuestSessionData();
      if (cached) return structuredClone(cached);
      await clearGuestScopedStorage();
      clearGuestSession();
      return structuredClone(DEFAULT_DATA);
    }

    try {
      const storageKey = await getScopedAppDataKey();
      let raw = await AsyncStorage.getItem(storageKey);

      if (!raw) {
        const migrated = await this.migrateLegacyUnscopedForActiveAccount();
        if (migrated) return this.finalizeLoaded(migrated);

        const legacy = await this.loadLegacyKeys();
        if (legacy) return this.finalizeLoaded(legacy);

        const fromBackup = await this.loadFromLocalBackupRaw();
        if (fromBackup) return fromBackup;

        return structuredClone(DEFAULT_DATA);
      }



      let parsed: AppData;

      try {

        parsed = JSON.parse(raw) as AppData;

      } catch {

        const fromBackup = await this.loadFromLocalBackupRaw();

        if (fromBackup) return fromBackup;

        return structuredClone(DEFAULT_DATA);

      }



      const normalized = normalizeLoadedData(mergeParsedAppData(parsed));
      const accepted = await acceptLoadedAppData(normalized);
      if (!accepted) {
        return structuredClone(DEFAULT_DATA);
      }

      if (!hasRecoverableContent(accepted)) {

        const fromBackup = await this.loadFromLocalBackupRaw();

        if (fromBackup) return fromBackup;

      }



      return this.finalizeLoaded(accepted);

    } catch {

      const fromBackup = await this.loadFromLocalBackupRaw();

      if (fromBackup) return fromBackup;

      return structuredClone(DEFAULT_DATA);

    }

  }



  private async finalizeLoaded(data: AppData): Promise<AppData> {

    const before = JSON.stringify(data.bundles);

    let next = await migratePersistedWebAssets(data);
    next = await repairAppDataAssets(next);

    const derivatives = await ensureAppDataDerivatives(next);
    next = derivatives.data;

    const quality = await upgradeLegacyPhotoQuality(next);
    next = quality.data;

    next = {
      ...next,
      settings: {
        ...next.settings,
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

    if (changed) {
      await this.persistLocal(next);
    }

    return next;

  }



  private async loadFromLocalBackupRaw(): Promise<AppData | null> {

    const raw = await readLocalBackupRaw();

    if (!raw) return null;

    try {

      const parsed = JSON.parse(raw) as AppData;

      if (!hasRecoverableContent(parsed)) return null;

      const merged = normalizeLoadedData(mergeParsedAppData(parsed));
      const accepted = await acceptLoadedAppData(merged);
      if (!accepted) return null;

      return this.finalizeLoaded(accepted);

    } catch {

      return null;

    }

  }



  async restoreLocalBackup(): Promise<AppData | null> {
    if (await isGuestSession()) return null;

    const restored = await this.loadFromLocalBackupRaw();

    if (!restored) return null;

    await this.persistLocal(restored);

    return restored;

  }



  private async loadLegacyKeys(): Promise<AppData | null> {
    const active = await getActiveAccountEmail();
    const keys = ['@memory_sherpa_v4', '@memora_app_v3', '@memora_app_v2', '@memora_app_v1'];

    for (const key of keys) {
      if (key === APP_DATA_KEY_BASE && active) continue;

      const raw = await AsyncStorage.getItem(key);
      if (!raw) continue;

      try {
        const migrated = migrateToV4(JSON.parse(raw));
        if (!(await dataMatchesActiveAccount(migrated))) continue;
        if (active) migrated.settings.cloudAccountEmail = active;
        await this.persistLocal(migrated);
        return migrated;
      } catch {
        continue;
      }
    }

    return null;
  }



  async saveAppData(data: AppData): Promise<void> {

    await this.persistLocal(data);

  }



  private async migrateLegacyUnscopedForActiveAccount(): Promise<AppData | null> {
    const accountEmail = await getActiveAccountEmail();
    if (!accountEmail) return null;

    const raw = await AsyncStorage.getItem(APP_DATA_KEY_BASE);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as AppData;
      const owner = parsed.settings?.cloudAccountEmail?.trim().toLowerCase() ?? null;
      if (owner && owner !== accountEmail) return null;

      const merged = normalizeLoadedData(mergeParsedAppData(parsed));
      merged.settings.cloudAccountEmail = accountEmail;
      await this.persistLocal(merged);
      return merged;
    } catch {
      return null;
    }
  }

  private async persistLocal(data: AppData): Promise<void> {
    if (await isGuestSession()) {
      setGuestSessionData(data);
      return;
    }

    const stamped = await stampRecoverySettings(data);
    const json = JSON.stringify(stamped);
    const storageKey = await getScopedAppDataKey();
    await AsyncStorage.setItem(storageKey, json);
    if (hasRecoverableContent(stamped)) {
      await writeLocalBackupRaw(json);
      await writeRecoveryManifest(stamped);
    }
  }



  async createThumbnail(

    sourceUri: string,

    bundleId: string,

    pageId: string

  ): Promise<ThumbnailResult> {

    return createMiniThumbnail(sourceUri, bundleId, pageId);

  }



  async uploadMasterAsset(_localUri: string, remotePath: string): Promise<UploadResult> {

    return { remotePath, uploadedAt: new Date().toISOString() };

  }



  async fetchMasterAsset(_remotePath: string, localDestUri: string): Promise<string> {

    return localDestUri;

  }



  async deleteRemoteAsset(_remotePath: string): Promise<void> {

    return;

  }



  async syncAllPending(data: AppData): Promise<AppData> {

    return {

      ...data,

      settings: {

        ...data.settings,

        lastCloudSyncAt: new Date().toISOString(),

      },

    };

  }



  async restoreFromCloudBackup(): Promise<AppData | null> {

    return null;

  }

}


