import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  GOOGLE_WEB_CLIENT_ID,
  isValidGoogleClientId,
} from '@/services/cloud/google-config';

const STORAGE_KEY = '@memory_sherpa_google_oauth_client_id';

export { isValidGoogleClientId };

export function isGoogleClientIdConfigured(clientId: string): boolean {
  return isValidGoogleClientId(clientId);
}

/** True when the deployed build includes a Web client ID (GitHub Secret / .env at export). */
export function isProductionGoogleConfigured(): boolean {
  return isValidGoogleClientId(GOOGLE_WEB_CLIENT_ID);
}

export function allowsDevClientIdOverride(): boolean {
  return __DEV__;
}

export async function loadStoredGoogleClientId(): Promise<string | null> {
  if (!allowsDevClientIdOverride()) return null;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw?.trim()) return null;
    return raw.trim();
  } catch {
    return null;
  }
}

export async function saveStoredGoogleClientId(clientId: string): Promise<void> {
  if (!allowsDevClientIdOverride()) return;
  const trimmed = clientId.trim();
  if (!trimmed) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, trimmed);
}

export async function clearStoredGoogleClientId(): Promise<void> {
  if (!allowsDevClientIdOverride()) return;
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/** Build-time client ID first; AsyncStorage override only in local dev. */
export async function getEffectiveGoogleClientId(): Promise<string> {
  if (isProductionGoogleConfigured()) {
    return GOOGLE_WEB_CLIENT_ID;
  }
  if (allowsDevClientIdOverride()) {
    const stored = await loadStoredGoogleClientId();
    if (stored && isValidGoogleClientId(stored)) return stored;
  }
  return '';
}
