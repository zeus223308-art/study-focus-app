import type { AppData } from '@/lib/domain/types';
import {
  packAppDataForBackup,
  parseBackupJson,
  restoreBackupEnvelope,
  shouldPreferRemoteBackup,
  type BackupEnvelope,
} from '@/services/cloud/backup-pack';
import {
  downloadDriveBackup,
  findDriveBackupFile,
  uploadDriveBackup,
} from '@/services/cloud/google-drive-api';
import { getValidAccessToken } from '@/services/cloud/google-session';
import { hasRecoverableContent, shouldUploadDriveBackup } from '@/services/storage/data-safety';

export type DriveSyncOutcome =
  | { status: 'skipped'; reason: 'no_session' | 'no_remote' | 'remote_empty' | 'local_newer' | 'local_empty' }
  | { status: 'pulled'; exportedAt: string }
  | { status: 'pushed'; exportedAt: string }
  | { status: 'error'; message: string };

export async function pullDriveBackupIfNewer(local: AppData): Promise<{
  data: AppData;
  outcome: DriveSyncOutcome;
}> {
  const token = await getValidAccessToken();
  if (!token) {
    return { data: local, outcome: { status: 'skipped', reason: 'no_session' } };
  }

  try {
    const file = await findDriveBackupFile(token);
    if (!file) {
      return { data: local, outcome: { status: 'skipped', reason: 'no_remote' } };
    }

    const raw = await downloadDriveBackup(token, file.id);
    const envelope = parseBackupJson(raw);

    if (!shouldPreferRemoteBackup(local, envelope)) {
      return { data: local, outcome: { status: 'skipped', reason: 'local_newer' } };
    }

    const restored = await restoreBackupEnvelope(envelope);
    return {
      data: restored,
      outcome: { status: 'pulled', exportedAt: envelope.exportedAt },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Drive pull failed';
    return { data: local, outcome: { status: 'error', message } };
  }
}

export async function pushDriveBackup(data: AppData): Promise<{
  data: AppData;
  outcome: DriveSyncOutcome;
}> {
  const token = await getValidAccessToken();
  if (!token) {
    return { data, outcome: { status: 'skipped', reason: 'no_session' } };
  }
  if (!shouldUploadDriveBackup(data)) {
    return { data, outcome: { status: 'skipped', reason: 'local_empty' } };
  }

  try {
    const envelope = await packAppDataForBackup(data);
    const jsonBody = JSON.stringify(envelope);
    const existing = await findDriveBackupFile(token);
    const uploaded = await uploadDriveBackup(token, jsonBody, existing?.id);

    const syncedAt = uploaded.modifiedTime ?? envelope.exportedAt;
    const next: AppData = {
      ...envelope.appData,
      settings: {
        ...envelope.appData.settings,
        cloudBackupEnabled: true,
        lastCloudSyncAt: syncedAt,
      },
    };

    return {
      data: next,
      outcome: { status: 'pushed', exportedAt: syncedAt },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Drive push failed';
    return { data, outcome: { status: 'error', message } };
  }
}

/** Always restore remote backup when it has content (ignores local_newer). */
export async function forcePullDriveBackup(local: AppData): Promise<{
  data: AppData;
  outcome: DriveSyncOutcome;
}> {
  const token = await getValidAccessToken();
  if (!token) {
    return { data: local, outcome: { status: 'skipped', reason: 'no_session' } };
  }

  try {
    const file = await findDriveBackupFile(token);
    if (!file) {
      return { data: local, outcome: { status: 'skipped', reason: 'no_remote' } };
    }

    const raw = await downloadDriveBackup(token, file.id);
    const envelope = parseBackupJson(raw);
    if (!hasRecoverableContent(envelope.appData)) {
      return { data: local, outcome: { status: 'skipped', reason: 'remote_empty' } };
    }

    const restored = await restoreBackupEnvelope(envelope);
    return {
      data: restored,
      outcome: { status: 'pulled', exportedAt: envelope.exportedAt },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Drive restore failed';
    return { data: local, outcome: { status: 'error', message } };
  }
}

export async function restoreDriveBackup(): Promise<BackupEnvelope | null> {
  const token = await getValidAccessToken();
  if (!token) return null;

  const file = await findDriveBackupFile(token);
  if (!file) return null;

  const raw = await downloadDriveBackup(token, file.id);
  return parseBackupJson(raw);
}
