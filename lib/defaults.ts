import type { AppData, ReviewSchedule } from './types';

export const DEFAULT_SCHEDULES: ReviewSchedule[] = [
  {
    id: 'sched_2days',
    name: '2일마다',
    mode: 'everyNDays',
    everyNDays: 2,
  },
  {
    id: 'sched_1357',
    name: '1·3·5·7일',
    mode: 'customIntervals',
    customIntervals: [1, 3, 5, 7],
  },
  {
    id: 'sched_3days',
    name: '3일마다',
    mode: 'everyNDays',
    everyNDays: 3,
  },
];

export const DEFAULT_FOLDERS = [
  { id: 'folder_math', name: '수학', reviewScheduleId: 'sched_1357' },
  { id: 'folder_science', name: '과학', reviewScheduleId: 'sched_1357' },
  { id: 'folder_korean', name: '국어', reviewScheduleId: 'sched_2days' },
  { id: 'folder_english', name: '영어', reviewScheduleId: 'sched_2days' },
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
  },
};
