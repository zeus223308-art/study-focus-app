import AsyncStorage from '@react-native-async-storage/async-storage';

import { GOOGLE_WEB_CLIENT_ID } from '@/services/cloud/google-config';

const STORAGE_KEY = '@memory_sherpa_google_oauth_client_id';

export async function loadStoredGoogleClientId(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw?.trim()) return null;
    return raw.trim();
  } catch {
    return null;
  }
}

export async function saveStoredGoogleClientId(clientId: string): Promise<void> {
  const trimmed = clientId.trim();
  if (!trimmed) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, trimmed);
}

export async function clearStoredGoogleClientId(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export function isValidGoogleClientId(clientId: string): boolean {
  return clientId.includes('.apps.googleusercontent.com') && clientId.length > 20;
}

export async function getEffectiveGoogleClientId(): Promise<string> {
  const stored = await loadStoredGoogleClientId();
  if (stored && isValidGoogleClientId(stored)) return stored;
  if (GOOGLE_WEB_CLIENT_ID && isValidGoogleClientId(GOOGLE_WEB_CLIENT_ID)) {
    return GOOGLE_WEB_CLIENT_ID;
  }
  return '';
}

export function isGoogleClientIdConfigured(clientId: string): boolean {
  return isValidGoogleClientId(clientId);
}
