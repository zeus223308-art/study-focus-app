import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_DATA } from './defaults';
import type { AppData } from './types';

const STORAGE_KEY = '@study_focus_data_v1';

export async function loadAppData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_DATA };
    const parsed = JSON.parse(raw) as AppData;
    return {
      ...DEFAULT_DATA,
      ...parsed,
      settings: { ...DEFAULT_DATA.settings, ...parsed.settings },
      subjects: parsed.subjects?.length ? parsed.subjects : DEFAULT_DATA.subjects,
    };
  } catch {
    return { ...DEFAULT_DATA };
  }
}

export async function saveAppData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
