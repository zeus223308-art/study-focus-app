export type Language = 'ko' | 'en';

/** Visible crop guide + save crop for camera / import */
export type CaptureFrameAspect = '4:3' | '3:4' | '1:1' | '16:9' | 'full';

export type SubscriptionTier = 'free' | 'pro';

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

export type SubjectFolder = {
  id: string;
  name: string;
  reviewScheduleId: string;
  color: string;
  sortOrder: number;
  createdAt: string;
  /** `${bundleId}:${pageId}` display order for album grid */
  itemOrder?: string[];
};

export type PenToolId = 'pen-black' | 'pen-red' | 'pen-blue';

export type HighlighterToolId = 'hi-yellow' | 'hi-green' | 'hi-pink';

export type InkToolId = PenToolId | HighlighterToolId | 'eraser';

export type InkPoint = { x: number; y: number };

export type InkStroke = {
  id: string;
  tool: InkToolId;
  points: InkPoint[];
  width: number;
  opacity: number;
  createdAt: string;
};

/** `normalized` = stroke points are 0..1 relative to the page image. */
export type InkStrokeSpace = 'viewport' | 'normalized';

export type NoteLayer = {
  id: string;
  studyDate: string;
  visible: boolean;
  /** When true, strokes are shown but not editable in the viewer. */
  locked?: boolean;
  strokeSpace?: InkStrokeSpace;
  strokes: InkStroke[];
  scratchpadOffsetY: number;
  scratchpadHeight: number;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type CloudSyncStatus = 'local_only' | 'pending_upload' | 'synced' | 'fetch_required' | 'error';

export type CloudAsset = {
  remotePath: string | null;
  thumbnailUri: string;
  localMiniUri: string;
  originalLocalUri: string | null;
  syncStatus: CloudSyncStatus;
  uploadedAt: string | null;
  lastFetchedAt: string | null;
};

export type NotePage = {
  id: string;
  bundleId: string;
  sortIndex: number;
  studyDate: string;
  textNote: string;
  tags: string[];
  asset: CloudAsset;
  answerAsset: CloudAsset | null;
  /** OCR text extracted from answer (back) image for auto-grading */
  answerOcrText: string;
  layers: NoteLayer[];
  ocrText: string;
  /** Slideshow dwell time for front (problem) image */
  slideshowSeconds: number;
  /** Slideshow dwell time for back (answer) image — up to 180s */
  answerSlideshowSeconds: number;
  createdAt: string;
  updatedAt: string;
};

export type ReviewCycleState = {
  reviewScheduleId: string;
  reviewAnchorDate: string;
  reviewStepIndex: number;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  aiScoreLast: number | null;
};

export type NoteBundle = {
  id: string;
  subjectId: string;
  studyDate: string;
  title: string;
  pageIds: string[];
  pages: NotePage[];
  archived: boolean;
  archivedAt: string | null;
  review: ReviewCycleState;
  createdAt: string;
  updatedAt: string;
};

export type TrashLifecycle = {
  id: string;
  bundleId: string;
  bundleSnapshot: NoteBundle;
  /** Whole subject folder snapshot when deleted from Files tab */
  subjectSnapshot?: SubjectFolder;
  deletedAt: string;
  uiExpiresAt: string;
  backupExpiresAt: string;
  cloudHardDeleteAt: string;
  restoredAt: string | null;
};

export type DateRibbonMark = {
  date: string;
  status: 'overdue' | 'complete' | 'upcoming' | 'none';
  bundleCount: number;
};

export type AppSettings = {
  language: Language;
  tier: SubscriptionTier;
  notificationsEnabled: boolean;
  notificationHour: number;
  notificationMinute: number;
  onboardingDone: boolean;
  /** yyyy-MM-dd — date ribbon starts here (first app open) */
  firstLaunchDate: string;
  photoLimit: number;
  memoLimit: number;
  activeScheduleIds: string[];
  defaultSlideshowSeconds: number;
  cloudBackupEnabled: boolean;
  lastCloudSyncAt: string | null;
  /** User had study photos/content — detects accidental wipe */
  hadStudyContent: boolean;
  lastSavedPageCount: number;
  lastSavedAt: string | null;
  lastAppVersion: string | null;
  lastAutoRecoveryAt: string | null;
  /** Google account that owns this local partition (prevents cross-user restore) */
  cloudAccountEmail: string | null;
  /** Last completed on-device photo derivative regeneration pass */
  assetQualityVersion?: number;
  /** Thumbnail rebuild failures from last load/restore (for user notice). */
  lastDerivativeRegenFailed?: number;
  lastDerivativeRegenAt?: string | null;
  captureFrameAspect?: CaptureFrameAspect;
};

export type AppData = {
  version: number;
  subjects: SubjectFolder[];
  schedules: ReviewSchedule[];
  bundles: NoteBundle[];
  trash: TrashLifecycle[];
  settings: AppSettings;
};

export type CaptureDraft = {
  imageUri: string;
  studyDate: string;
  subjectId: string;
  saveToExistingBundleId: string | null;
};

export type LayerCycleChoice = 'maintain' | 'reset';

export type BlackoutSession = {
  bundleId: string;
  pageId: string;
  startedAt: string;
  revealedHint: boolean;
};
