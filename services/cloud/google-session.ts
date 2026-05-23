import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  GOOGLE_TOKEN_STORAGE_KEY,
  type GoogleDriveSession,
} from '@/services/cloud/google-config';

export async function loadGoogleDriveSession(): Promise<GoogleDriveSession | null> {
  try {
    const raw = await AsyncStorage.getItem(GOOGLE_TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GoogleDriveSession;
    if (!parsed.accessToken) return null;
    if (parsed.expiresAt && Date.now() > parsed.expiresAt - 60_000) {
      await AsyncStorage.removeItem(GOOGLE_TOKEN_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function saveGoogleDriveSession(session: GoogleDriveSession): Promise<void> {
  await AsyncStorage.setItem(GOOGLE_TOKEN_STORAGE_KEY, JSON.stringify(session));
}

export async function clearGoogleDriveSession(): Promise<void> {
  await AsyncStorage.removeItem(GOOGLE_TOKEN_STORAGE_KEY);
}

export async function getValidAccessToken(): Promise<string | null> {
  const session = await loadGoogleDriveSession();
  return session?.accessToken ?? null;
}
