import AsyncStorage from '@react-native-async-storage/async-storage';

import { FOLDER_COLORS, theme } from '@/constants/theme';
import { DEFAULT_DATA } from './defaults';
import type { AppData, Folder } from './types';

const KEY = '@memora_app_v3';

function migrateFolders(folders: Folder[]): Folder[] {
  return folders.map((f) => ({
    ...f,
    color: f.color ?? FOLDER_COLORS[f.id] ?? theme.subject.default,
    reviewScheduleId:
      f.reviewScheduleId === 'sched_1357' ? 'sched_135714' : f.reviewScheduleId,
  }));
}

export async function loadAppData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
      const legacy = await AsyncStorage.getItem('@memora_app_v2');
      if (legacy) {
        const parsed = JSON.parse(legacy) as AppData;
        const migrated = {
          ...DEFAULT_DATA,
          ...parsed,
          settings: {
            ...DEFAULT_DATA.settings,
            ...parsed.settings,
            activeScheduleIds:
              parsed.settings.activeScheduleIds ?? DEFAULT_DATA.settings.activeScheduleIds,
          },
          schedules: DEFAULT_DATA.schedules,
          folders: migrateFolders(parsed.folders ?? DEFAULT_DATA.folders),
        };
        await saveAppData(migrated);
        return migrated;
      }
      return structuredClone(DEFAULT_DATA);
    }
    const parsed = JSON.parse(raw) as AppData;
    return {
      ...DEFAULT_DATA,
      ...parsed,
      settings: {
        ...DEFAULT_DATA.settings,
        ...parsed.settings,
        activeScheduleIds:
          parsed.settings.activeScheduleIds ?? DEFAULT_DATA.settings.activeScheduleIds,
      },
      schedules: DEFAULT_DATA.schedules,
      folders: migrateFolders(parsed.folders?.length ? parsed.folders : DEFAULT_DATA.folders),
    };
  } catch {
    return structuredClone(DEFAULT_DATA);
  }
}

export async function saveAppData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}
