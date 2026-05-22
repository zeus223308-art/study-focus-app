export type Language = 'ko' | 'en';

export type ReviewScheduleMode = 'everyNDays' | 'customIntervals';

export type ScheduleTier = 'standard' | 'premium';

export type ReviewSchedule = {
  id: string;
  name: string;
  nameEn: string;
  mode: ReviewScheduleMode;
  everyNDays?: number;
  customIntervals?: number[];
  tier: ScheduleTier;
};

export type Folder = {
  id: string;
  name: string;
  reviewScheduleId: string;
  color: string;
  createdAt: string;
};

export type StudyItem = {
  id: string;
  folderId: string;
  studyDate: string;
  imageUri: string;
  textNote: string;
  archived: boolean;
  tags: string[];
  reviewScheduleId: string;
  reviewAnchorDate: string;
  reviewStepIndex: number;
  lastReviewedAt: string | null;
  slideshowSeconds: number;
  layers: AnnotationLayer[];
  answerImageUri?: string;
  problemImageUri?: string;
  createdAt: string;
};

export type AnnotationLayer = {
  id: string;
  studyDate: string;
  imageUri: string;
  note: string;
  visible: boolean;
  createdAt: string;
};

export type TrashEntry = {
  id: string;
  item: StudyItem;
  deletedAt: string;
};

export type AppSettings = {
  language: Language;
  notificationsEnabled: boolean;
  notificationHour: number;
  notificationMinute: number;
  onboardingDone: boolean;
  photoLimit: number;
  memoLimit: number;
  /** 복습 패턴 최대 2개 (스케치) */
  activeScheduleIds: string[];
};

export type AppData = {
  folders: Folder[];
  schedules: ReviewSchedule[];
  items: StudyItem[];
  trash: TrashEntry[];
  settings: AppSettings;
};
