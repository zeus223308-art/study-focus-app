import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadGoogleDriveSession } from '@/services/cloud/google-session';

export const APP_DATA_KEY_BASE = '@memory_sherpa_v4';
export const LOCAL_BACKUP_KEY_BASE = '@memory_sherpa_v4_backup';
export const RECOVERY_MANIFEST_KEY_BASE = '@memory_sherpa_recovery_manifest';

export const GUEST_SCOPE = 'guest';

function sanitizeScopeId(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return GUEST_SCOPE;
  return trimmed.replace(/[^a-z0-9._@+-]/g, '_');
}

/** Active local storage partition: one per Google account; guest when signed out. */
export async function getActiveStorageScopeId(): Promise<string> {
  const session = await loadGoogleDriveSession();
  if (session?.email) return sanitizeScopeId(session.email);
  return GUEST_SCOPE;
}

export function scopedStorageKey(base: string, scopeId: string): string {
  return `${base}__${scopeId}`;
}

export async function getScopedAppDataKey(): Promise<string> {
  return scopedStorageKey(APP_DATA_KEY_BASE, await getActiveStorageScopeId());
}

export async function getScopedLocalBackupKey(): Promise<string> {
  return scopedStorageKey(LOCAL_BACKUP_KEY_BASE, await getActiveStorageScopeId());
}

export async function getScopedRecoveryManifestKey(): Promise<string> {
  return scopedStorageKey(RECOVERY_MANIFEST_KEY_BASE, await getActiveStorageScopeId());
}

export async function getActiveAccountEmail(): Promise<string | null> {
  const session = await loadGoogleDriveSession();
  return session?.email?.trim().toLowerCase() ?? null;
}

export async function isGuestSession(): Promise<boolean> {
  return (await getActiveAccountEmail()) === null;
}

/** Wipe ephemeral guest partition (called on each cold start while logged out). */
export async function clearGuestScopedStorage(): Promise<void> {
  await AsyncStorage.multiRemove([
    scopedStorageKey(APP_DATA_KEY_BASE, GUEST_SCOPE),
    scopedStorageKey(LOCAL_BACKUP_KEY_BASE, GUEST_SCOPE),
    scopedStorageKey(RECOVERY_MANIFEST_KEY_BASE, GUEST_SCOPE),
  ]);
}
