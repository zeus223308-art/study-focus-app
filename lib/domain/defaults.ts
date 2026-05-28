import { theme } from '@/constants/theme';
import { ASSET_QUALITY_VERSION } from '@/lib/files/image-quality';

import { todayKey } from './dates';
import type { AppData, ReviewSchedule, SubjectFolder } from './types';

export const DEFAULT_SCHEDULES: ReviewSchedule[] = [
  {
    id: 'sched_135714',
    name: '1-3-7-14-30',
    nameEn: '1-3-7-14-30',
    mode: 'customIntervals',
    customIntervals: [1, 3, 7, 14, 30],
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
    name: '+추가',
    nameEn: '+ Add',
    mode: 'customIntervals',
    customIntervals: [1, 3, 5, 7, 14],
    tier: 'premium',
  },
];

export const DEFAULT_SUBJECTS: Omit<SubjectFolder, 'createdAt' | 'sortOrder'>[] = [
  { id: 'folder_math', name: '수학', reviewScheduleId: 'sched_135714', color: theme.gray },
  { id: 'folder_english', name: '영어', reviewScheduleId: 'sched_135714', color: theme.graySecondary },
  { id: 'folder_science', name: '과학', reviewScheduleId: 'sched_daily', color: theme.grayMuted },
  { id: 'folder_korean', name: '국어', reviewScheduleId: 'sched_daily', color: theme.black },
  { id: 'folder_history', name: '역사', reviewScheduleId: 'sched_135714', color: theme.gray },
  { id: 'folder_social', name: '사회', reviewScheduleId: 'sched_135714', color: theme.graySecondary },
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
    onboardingDone: true,
    firstLaunchDate: todayKey(),
    photoLimit: theme.limits.freeImages,
    memoLimit: theme.limits.freeMemos,
    activeScheduleIds: ['sched_135714', 'sched_daily'],
    defaultSlideshowSeconds: 10,
    cloudBackupEnabled: true,
    lastCloudSyncAt: null,
    hadStudyContent: false,
    lastSavedPageCount: 0,
    lastSavedAt: null,
    lastAppVersion: null,
    lastAutoRecoveryAt: null,
    cloudAccountEmail: null,
    assetQualityVersion: ASSET_QUALITY_VERSION,
    captureFrameAspect: '4:3',
  },
};

export const PEN_TOOLS = [
  { id: 'pen-black' as const, color: '#000000', width: 2, label: 'Black' },
  { id: 'pen-white' as const, color: '#FFFFFF', width: 2, label: 'White' },
  { id: 'pen-red' as const, color: '#DC2626', width: 2, label: 'Red' },
  { id: 'pen-blue' as const, color: '#2563EB', width: 2, label: 'Blue' },
];

export const HIGHLIGHTER_TOOLS = [
  { id: 'hi-yellow' as const, color: '#FFE600', width: 12, opacity: 0.45, label: 'Yellow' },
  { id: 'hi-green' as const, color: '#4ADE80', width: 12, opacity: 0.4, label: 'Green' },
  { id: 'hi-pink' as const, color: '#F472B6', width: 12, opacity: 0.4, label: 'Pink' },
];
