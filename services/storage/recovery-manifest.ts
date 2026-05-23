import AsyncStorage from '@react-native-async-storage/async-storage';

import Constants from 'expo-constants';

import type { AppData } from '@/lib/domain/types';

import { countAppPages, hasRecoverableContent } from './data-safety';
import { getActiveAccountEmail, getScopedRecoveryManifestKey } from './storage-scope';

export type RecoveryManifest = {
  accountEmail: string | null;
  hadStudyContent: boolean;
  lastSavedPageCount: number;
  lastSavedAt: string;
  lastAppVersion: string;
};

export function currentAppVersion(): string {
  return Constants.expoConfig?.version ?? '1.0.0';
}

export async function writeRecoveryManifest(data: AppData): Promise<void> {
  if (!hasRecoverableContent(data)) return;
  const pages = countAppPages(data);
  const manifest: RecoveryManifest = {
    accountEmail: data.settings.cloudAccountEmail,
    hadStudyContent: true,
    lastSavedPageCount: pages,
    lastSavedAt: new Date().toISOString(),
    lastAppVersion: currentAppVersion(),
  };
  const key = await getScopedRecoveryManifestKey();
  await AsyncStorage.setItem(key, JSON.stringify(manifest));
}

export async function readRecoveryManifest(): Promise<RecoveryManifest | null> {
  try {
    const key = await getScopedRecoveryManifestKey();
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RecoveryManifest;
    if (!parsed.hadStudyContent) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function shouldAttemptAutoRecovery(data: AppData): Promise<boolean> {
  if (hasRecoverableContent(data)) return false;

  const manifest = await readRecoveryManifest();
  const active = await getActiveAccountEmail();
  if (manifest?.accountEmail && active && manifest.accountEmail !== active) {
    return false;
  }
  if (manifest?.accountEmail && !active) {
    return false;
  }
  if (manifest?.hadStudyContent) return true;

  const s = data.settings;
  if (s.hadStudyContent) return true;
  if (s.lastSavedPageCount > 0) return true;
  if (s.lastCloudSyncAt) return true;

  return false;
}
