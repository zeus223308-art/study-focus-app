import AsyncStorage from '@react-native-async-storage/async-storage';

import { getScopedLocalBackupKey } from './storage-scope';

export async function readLocalBackupRaw(): Promise<string | null> {
  const key = await getScopedLocalBackupKey();
  return AsyncStorage.getItem(key);
}

export async function writeLocalBackupRaw(json: string): Promise<void> {
  const key = await getScopedLocalBackupKey();
  await AsyncStorage.setItem(key, json);
}
