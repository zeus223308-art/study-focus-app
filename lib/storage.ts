import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_DATA } from './defaults';
import type { AppData } from './types';

const KEY = '@memora_app_v2';

export async function loadAppData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);
    const parsed = JSON.parse(raw) as AppData;
    return {
      ...DEFAULT_DATA,
      ...parsed,
      settings: { ...DEFAULT_DATA.settings, ...parsed.settings },
      schedules: parsed.schedules?.length ? parsed.schedules : DEFAULT_DATA.schedules,
      folders: parsed.folders?.length ? parsed.folders : DEFAULT_DATA.folders,
    };
  } catch {
    return structuredClone(DEFAULT_DATA);
  }
}

export async function saveAppData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}
