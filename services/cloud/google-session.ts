import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import {
  GOOGLE_TOKEN_STORAGE_KEY,
  type GoogleDriveSession,
} from '@/services/cloud/google-config';
import { fetchGoogleEmail } from '@/services/cloud/google-drive-api';
import { refreshGoogleAccessToken } from '@/services/cloud/google-token-refresh';

const TOKEN_FRESHNESS_MS = 60_000;

async function readStoredSession(): Promise<GoogleDriveSession | null> {
  try {
    const raw = await AsyncStorage.getItem(GOOGLE_TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GoogleDriveSession;
    if (!parsed.accessToken && !parsed.refreshToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isAccessTokenFresh(session: GoogleDriveSession): boolean {
  return Boolean(
    session.accessToken && session.expiresAt && Date.now() < session.expiresAt - TOKEN_FRESHNESS_MS
  );
}

/** Restore session on app start; silently refreshes expired access tokens when possible. */
export async function ensureGoogleDriveSession(): Promise<GoogleDriveSession | null> {
  const stored = await readStoredSession();
  if (!stored) return null;

  if (isAccessTokenFresh(stored)) return stored;

  if (!stored.refreshToken) {
    // Web OAuth (implicit) has no refresh token — use access token until expiry, then re-login.
    if (Platform.OS === 'web') {
      if (isAccessTokenFresh(stored)) return stored;
      await clearGoogleDriveSession();
      return null;
    }
    await clearGoogleDriveSession();
    return null;
  }

  try {
    const refreshed = await refreshGoogleAccessToken(stored.refreshToken);
    const next: GoogleDriveSession = {
      accessToken: refreshed.accessToken,
      expiresAt: Date.now() + refreshed.expiresIn * 1000,
      email: stored.email,
      refreshToken: refreshed.refreshToken ?? stored.refreshToken,
    };
    if (!next.email) {
      next.email = await fetchGoogleEmail(next.accessToken);
    }
    await saveGoogleDriveSession(next);
    return next;
  } catch {
    await clearGoogleDriveSession();
    return null;
  }
}

export async function loadGoogleDriveSession(): Promise<GoogleDriveSession | null> {
  return ensureGoogleDriveSession();
}

export async function saveGoogleDriveSession(session: GoogleDriveSession): Promise<void> {
  await AsyncStorage.setItem(GOOGLE_TOKEN_STORAGE_KEY, JSON.stringify(session));
}

export async function clearGoogleDriveSession(): Promise<void> {
  await AsyncStorage.removeItem(GOOGLE_TOKEN_STORAGE_KEY);
}

export async function getValidAccessToken(): Promise<string | null> {
  const session = await ensureGoogleDriveSession();
  return session?.accessToken ?? null;
}

export async function hasStoredGoogleRefreshToken(): Promise<boolean> {
  const stored = await readStoredSession();
  return Boolean(stored?.refreshToken);
}
