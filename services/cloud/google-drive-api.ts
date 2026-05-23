import {
  DRIVE_BACKUP_FILENAME,
  type GoogleDriveSession,
} from '@/services/cloud/google-config';

type DriveFile = { id: string; name: string; modifiedTime: string };

async function driveFetch(accessToken: string, url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });
}

export async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await driveFetch(
      accessToken,
      'https://www.googleapis.com/oauth2/v2/userinfo'
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { email?: string };
    return json.email ?? null;
  } catch {
    return null;
  }
}

export async function findDriveBackupFile(accessToken: string): Promise<DriveFile | null> {
  const q = encodeURIComponent(`name='${DRIVE_BACKUP_FILENAME}' and trashed=false`);
  const res = await driveFetch(
    accessToken,
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,name,modifiedTime)`
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive list failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as { files?: DriveFile[] };
  return json.files?.[0] ?? null;
}

export async function downloadDriveBackup(accessToken: string, fileId: string): Promise<string> {
  const res = await driveFetch(
    accessToken,
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive download failed: ${res.status} ${text}`);
  }
  return res.text();
}

export async function uploadDriveBackup(
  accessToken: string,
  jsonBody: string,
  existingFileId?: string
): Promise<{ fileId: string; modifiedTime: string }> {
  const boundary = 'memorysherpa_backup_boundary';
  const metadata = existingFileId
    ? { name: DRIVE_BACKUP_FILENAME }
    : { name: DRIVE_BACKUP_FILENAME, parents: ['appDataFolder'] };

  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    `${jsonBody}\r\n` +
    `--${boundary}--`;

  const url = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart&fields=id,modifiedTime`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime';

  const method = existingFileId ? 'PATCH' : 'POST';

  const res = await driveFetch(accessToken, url, {
    method,
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive upload failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as { id: string; modifiedTime: string };
  return { fileId: json.id, modifiedTime: json.modifiedTime };
}

export async function buildSessionFromToken(
  accessToken: string,
  expiresInSeconds = 3600,
  extras?: Partial<Pick<GoogleDriveSession, 'refreshToken' | 'email'>>
): Promise<GoogleDriveSession> {
  const email = extras?.email ?? (await fetchGoogleEmail(accessToken));
  return {
    accessToken,
    expiresAt: Date.now() + expiresInSeconds * 1000,
    email,
    refreshToken: extras?.refreshToken,
  };
}
