import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_DATA, DEFAULT_SCHEDULES } from '@/lib/domain/defaults';
import { normalizeAppSettings } from '@/lib/domain/dates';
import { normalizeFolderScheduleId } from '@/lib/domain/folder-schedule';
import type { AppData } from '@/lib/domain/types';
import { migratePersistedWebAssets } from '@/lib/files/migrate-web-assets';
import { migrateToV4 } from '@/services/storage/migration';

import type { StorageProvider, ThumbnailResult, UploadResult } from './types';
import { createMiniThumbnail } from './asset-pipeline';

const STORAGE_KEY = '@memory_sherpa_v4';

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

export class LocalStorageProvider implements StorageProvider {
  async loadAppData(): Promise<AppData> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const legacy = await this.loadLegacyKeys();
        if (legacy) {
          const normalized = normalizeLoadedData(legacy);
          const withWebAssets = await migratePersistedWebAssets(normalized);
          await this.saveAppData(withWebAssets);
          return withWebAssets;
        }
        return structuredClone(DEFAULT_DATA);
      }
      const parsed = JSON.parse(raw) as AppData;
      const merged: AppData = {
        ...DEFAULT_DATA,
        ...parsed,
        settings: { ...DEFAULT_DATA.settings, ...parsed.settings },
        schedules: parsed.schedules?.length ? parsed.schedules : DEFAULT_DATA.schedules,
        subjects: parsed.subjects?.length ? parsed.subjects : DEFAULT_DATA.subjects,
      };
      const normalized = normalizeLoadedData(merged);
      const before = JSON.stringify(normalized.bundles);
      const withWebAssets = await migratePersistedWebAssets(normalized);
      if (before !== JSON.stringify(withWebAssets.bundles)) {
        await this.saveAppData(withWebAssets);
      }
      return withWebAssets;
    } catch {
      return structuredClone(DEFAULT_DATA);
    }
  }

  private async loadLegacyKeys(): Promise<AppData | null> {
    for (const key of ['@memory_sherpa_v4', '@memora_app_v3', '@memora_app_v2', '@memora_app_v1']) {
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        const migrated = migrateToV4(JSON.parse(raw));
        await this.saveAppData(migrated);
        return migrated;
      }
    }
    return null;
  }

  async saveAppData(data: AppData): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
