import type { AppData } from '@/lib/domain/types';
import { pullDriveBackupIfNewer, pushDriveBackup } from '@/services/cloud/drive-sync';
import { getValidAccessToken } from '@/services/cloud/google-session';

import type { StorageProvider, ThumbnailResult, UploadResult } from './types';
import { createMiniThumbnail } from './asset-pipeline';
import { LocalStorageProvider } from './local-provider';

const PUSH_DEBOUNCE_MS = 4000;

/**
 * Local-first storage with optional Google Drive appDataFolder backup (web + native).
 * Thumbnails stay on device; full backup JSON includes embedded image blobs for web.
 */
export class CloudStorageProvider implements StorageProvider {
  private local = new LocalStorageProvider();
  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  private pushInFlight = false;

  async loadAppData(): Promise<AppData> {
    const local = await this.local.loadAppData();
    const token = await getValidAccessToken();
    if (!token) return local;

    const pulled = await pullDriveBackupIfNewer(local);
    if (pulled.outcome.status === 'pulled') {
      await this.local.saveAppData(pulled.data);
      return pulled.data;
    }

    if (
      pulled.outcome.status === 'skipped' &&
      pulled.outcome.reason === 'no_remote' &&
      local.bundles.length > 0
    ) {
      const pushed = await pushDriveBackup(local);
      if (pushed.outcome.status === 'pushed') {
        await this.local.saveAppData(pushed.data);
        return pushed.data;
      }
    }

    return pulled.data;
  }

  async saveAppData(data: AppData): Promise<void> {
    await this.local.saveAppData(data);
    void this.scheduleDrivePush();
  }

  async createThumbnail(
    sourceUri: string,
    bundleId: string,
    pageId: string
  ): Promise<ThumbnailResult> {
    return createMiniThumbnail(sourceUri, bundleId, pageId);
  }

  async uploadMasterAsset(localUri: string, remotePath: string): Promise<UploadResult> {
    return this.local.uploadMasterAsset(localUri, remotePath);
  }

  async fetchMasterAsset(remotePath: string, localDestUri: string): Promise<string> {
    return this.local.fetchMasterAsset(remotePath, localDestUri);
  }

  async deleteRemoteAsset(_remotePath: string): Promise<void> {
    return;
  }

  async syncAllPending(data: AppData): Promise<AppData> {
    let next = await this.local.syncAllPending(data);
    const token = await getValidAccessToken();
    if (!token) return next;

    const pulled = await pullDriveBackupIfNewer(next);
    if (pulled.outcome.status === 'pulled') {
      next = pulled.data;
      await this.local.saveAppData(next);
    }

    const pushed = await pushDriveBackup(next);
    if (pushed.outcome.status === 'pushed') {
      next = pushed.data;
      await this.local.saveAppData(next);
    }

    return next;
  }

  async restoreFromCloudBackup(): Promise<AppData | null> {
    const local = await this.local.loadAppData();
    const { data, outcome } = await pullDriveBackupIfNewer(local);
    if (outcome.status === 'pulled') {
      await this.local.saveAppData(data);
      return data;
    }
    return null;
  }

  private scheduleDrivePush(): void {
    if (this.pushTimer) clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => {
      this.pushTimer = null;
      void this.flushDrivePush();
    }, PUSH_DEBOUNCE_MS);
  }

  private async flushDrivePush(): Promise<void> {
    if (this.pushInFlight) return;
    const token = await getValidAccessToken();
    if (!token) return;

    this.pushInFlight = true;
    try {
      const latest = await this.local.loadAppData();
      const { data, outcome } = await pushDriveBackup(latest);
      if (outcome.status === 'pushed') {
        await this.local.saveAppData(data);
      }
    } finally {
      this.pushInFlight = false;
    }
  }
}

export function createStorageProvider(): StorageProvider {
  return new CloudStorageProvider();
}
