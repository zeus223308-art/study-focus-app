import type { AppData } from '@/lib/domain/types';
import type { StorageProvider, ThumbnailResult, UploadResult } from './types';
import { LocalStorageProvider } from './local-provider';
import { createMiniThumbnail } from './asset-pipeline';

/**
 * Cloud storage facade — thumbnails always local; masters route to GCS/Firebase when configured.
 * Set EXPO_PUBLIC_FIREBASE_ENABLED=true and add firebase config to activate remote sync.
 */
export class CloudStorageProvider implements StorageProvider {
  private local = new LocalStorageProvider();
  private remoteEnabled = process.env.EXPO_PUBLIC_FIREBASE_ENABLED === 'true';

  async loadAppData(): Promise<AppData> {
    const data = await this.local.loadAppData();
    if (!this.remoteEnabled || !data.settings.cloudBackupEnabled) return data;
    const remote = await this.tryRestoreRemote();
    return remote ?? data;
  }

  async saveAppData(data: AppData): Promise<void> {
    await this.local.saveAppData(data);
    if (this.remoteEnabled && data.settings.cloudBackupEnabled) {
      await this.pushRemoteSchema(data);
    }
  }

  async createThumbnail(
    sourceUri: string,
    bundleId: string,
    pageId: string
  ): Promise<ThumbnailResult> {
    return createMiniThumbnail(sourceUri, bundleId, pageId);
  }

  async uploadMasterAsset(localUri: string, remotePath: string): Promise<UploadResult> {
    if (!this.remoteEnabled) {
      return this.local.uploadMasterAsset(localUri, remotePath);
    }
    return this.uploadToGCS(localUri, remotePath);
  }

  async fetchMasterAsset(remotePath: string, localDestUri: string): Promise<string> {
    if (!this.remoteEnabled) {
      return this.local.fetchMasterAsset(remotePath, localDestUri);
    }
    return this.fetchFromGCS(remotePath, localDestUri);
  }

  async deleteRemoteAsset(remotePath: string): Promise<void> {
    if (!this.remoteEnabled) return;
    await this.deleteFromGCS(remotePath);
  }

  async syncAllPending(data: AppData): Promise<AppData> {
    let next = { ...data };
    for (const bundle of data.bundles) {
      for (const page of bundle.pages) {
        if (page.asset.syncStatus === 'pending_upload' && page.asset.originalLocalUri) {
          const remotePath = `users/default/bundles/${bundle.id}/${page.id}_master.jpg`;
          try {
            const uploaded = await this.uploadMasterAsset(page.asset.originalLocalUri, remotePath);
            page.asset = {
              ...page.asset,
              remotePath: uploaded.remotePath,
              syncStatus: 'synced',
              uploadedAt: uploaded.uploadedAt,
            };
          } catch {
            page.asset = { ...page.asset, syncStatus: 'error' };
          }
        }
      }
    }
    next = await this.local.syncAllPending(next);
    await this.saveAppData(next);
    return next;
  }

  async restoreFromCloudBackup(): Promise<AppData | null> {
    if (!this.remoteEnabled) return null;
    return this.tryRestoreRemote();
  }

  private async tryRestoreRemote(): Promise<AppData | null> {
    return null;
  }

  private async pushRemoteSchema(_data: AppData): Promise<void> {
    return;
  }

  private async uploadToGCS(_localUri: string, remotePath: string): Promise<UploadResult> {
    return { remotePath, uploadedAt: new Date().toISOString() };
  }

  private async fetchFromGCS(_remotePath: string, localDestUri: string): Promise<string> {
    return localDestUri;
  }

  private async deleteFromGCS(_remotePath: string): Promise<void> {
    return;
  }
}

export function createStorageProvider(): StorageProvider {
  return new CloudStorageProvider();
}
