import { FOLDER_COLORS, theme } from '@/constants/theme';

import type { AppData, ReviewSchedule } from './types';

/** 스케치: ① 1-3-5-7-14 ② 매일 ③ 이틀에 한 번(프리미엄) */
export const DEFAULT_SCHEDULES: ReviewSchedule[] = [
  {
    id: 'sched_135714',
    name: '1-3-5-7-14',
    nameEn: '1-3-5-7-14',
    mode: 'customIntervals',
    customIntervals: [1, 3, 5, 7, 14],
    tier: 'standard',
  },
  {
    id: 'sched_daily',
    name: '매일',
    nameEn: 'Daily',
    mode: 'everyNDays',
    everyNDays: 1,
    tier: 'standard',
  },
  {
    id: 'sched_2days',
    name: '이틀에 한 번',
    nameEn: 'Every 2 days',
    mode: 'everyNDays',
    everyNDays: 2,
    tier: 'premium',
  },
];

export const DEFAULT_FOLDERS = [
  { id: 'folder_math', name: '수학', reviewScheduleId: 'sched_135714', color: FOLDER_COLORS.folder_math },
  { id: 'folder_english', name: '영어', reviewScheduleId: 'sched_135714', color: FOLDER_COLORS.folder_english },
  { id: 'folder_science', name: '과학', reviewScheduleId: 'sched_daily', color: FOLDER_COLORS.folder_science ?? theme.subject.science },
  { id: 'folder_korean', name: '국어', reviewScheduleId: 'sched_daily', color: FOLDER_COLORS.folder_korean ?? theme.subject.korean },
];

export const DEFAULT_DATA: AppData = {
  folders: DEFAULT_FOLDERS.map((f) => ({
    ...f,
    createdAt: new Date().toISOString(),
  })),
  schedules: DEFAULT_SCHEDULES,
  items: [],
  trash: [],
  settings: {
    language: 'ko',
    notificationsEnabled: true,
    notificationHour: 9,
    notificationMinute: 0,
    onboardingDone: false,
    photoLimit: 300,
    memoLimit: 100,
    activeScheduleIds: ['sched_135714', 'sched_daily'],
  },
};
