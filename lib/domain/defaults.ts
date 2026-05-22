import { theme } from '@/constants/theme';

import { todayKey } from './dates';
import type { AppData, ReviewSchedule, SubjectFolder } from './types';

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

export const DEFAULT_SUBJECTS: Omit<SubjectFolder, 'createdAt' | 'sortOrder'>[] = [
  { id: 'folder_math', name: '수학', reviewScheduleId: 'sched_135714', color: theme.gray },
  { id: 'folder_english', name: '영어', reviewScheduleId: 'sched_135714', color: theme.graySecondary },
  { id: 'folder_science', name: '과학', reviewScheduleId: 'sched_daily', color: theme.grayMuted },
  { id: 'folder_korean', name: '국어', reviewScheduleId: 'sched_daily', color: theme.black },
  { id: 'folder_history', name: '역사', reviewScheduleId: 'sched_2days', color: theme.gray },
];

export const DEFAULT_DATA: AppData = {
  version: 4,
  subjects: DEFAULT_SUBJECTS.map((s, i) => ({
    ...s,
    sortOrder: i,
    createdAt: new Date().toISOString(),
  })),
  schedules: DEFAULT_SCHEDULES,
  bundles: [],
  trash: [],
  settings: {
    language: 'ko',
    tier: 'free',
    notificationsEnabled: true,
    notificationHour: 9,
    notificationMinute: 0,
    onboardingDone: false,
    firstLaunchDate: todayKey(),
    photoLimit: theme.limits.freeImages,
    memoLimit: theme.limits.freeMemos,
    activeScheduleIds: ['sched_135714', 'sched_daily'],
    defaultSlideshowSeconds: 10,
    cloudBackupEnabled: true,
    lastCloudSyncAt: null,
  },
};

export const PEN_TOOLS = [
  { id: 'pen-black' as const, color: '#0D0D0D', width: 2, label: 'Black' },
  { id: 'pen-red' as const, color: '#DC2626', width: 2, label: 'Red' },
  { id: 'pen-blue' as const, color: '#2563EB', width: 2, label: 'Blue' },
];

export const HIGHLIGHTER_TOOLS = [
  { id: 'hi-yellow' as const, color: 'rgba(255, 230, 0, 0.45)', width: 12, label: 'Yellow' },
  { id: 'hi-green' as const, color: 'rgba(74, 222, 128, 0.4)', width: 12, label: 'Green' },
  { id: 'hi-pink' as const, color: 'rgba(244, 114, 182, 0.4)', width: 12, label: 'Pink' },
];
