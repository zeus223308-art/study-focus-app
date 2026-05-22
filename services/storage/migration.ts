import { DEFAULT_DATA, DEFAULT_SCHEDULES } from '@/lib/domain/defaults';
import { inferFirstLaunchDate } from '@/lib/domain/dates';
import type {
  AppData,
  CloudAsset,
  NoteBundle,
  NotePage,
  ReviewCycleState,
  SubjectFolder,
} from '@/lib/domain/types';
import { theme } from '@/constants/theme';

type LegacyItem = {
  id: string;
  folderId: string;
  studyDate: string;
  imageUri: string;
  textNote?: string;
  archived?: boolean;
  tags?: string[];
  reviewScheduleId: string;
  reviewAnchorDate: string;
  reviewStepIndex: number;
  lastReviewedAt: string | null;
  slideshowSeconds?: number;
  layers?: unknown[];
  answerImageUri?: string;
  createdAt: string;
};

type LegacyFolder = {
  id: string;
  name: string;
  reviewScheduleId: string;
  color?: string;
  createdAt: string;
};

type LegacyData = {
  folders?: LegacyFolder[];
  subjects?: SubjectFolder[];
  schedules?: AppData['schedules'];
  items?: LegacyItem[];
  bundles?: NoteBundle[];
  trash?: AppData['trash'];
  settings?: Partial<AppData['settings']>;
};

function legacyAsset(uri: string): CloudAsset {
  return {
    remotePath: null,
    thumbnailUri: uri,
    localMiniUri: uri,
    originalLocalUri: uri,
    syncStatus: 'local_only',
    uploadedAt: null,
    lastFetchedAt: null,
  };
}

function itemToPage(item: LegacyItem, bundleId: string, sortIndex: number): NotePage {
  return {
    id: item.id,
    bundleId,
    sortIndex,
    studyDate: item.studyDate,
    textNote: item.textNote ?? '',
    tags: item.tags ?? [],
    asset: legacyAsset(item.imageUri),
    answerAsset: item.answerImageUri ? legacyAsset(item.answerImageUri) : null,
    layers: [],
    ocrText: '',
    slideshowSeconds: item.slideshowSeconds ?? 10,
    createdAt: item.createdAt,
    updatedAt: item.createdAt,
  };
}

function groupItemsIntoBundles(items: LegacyItem[]): NoteBundle[] {
  const map = new Map<string, LegacyItem[]>();
  for (const item of items) {
    const key = `${item.folderId}::${item.studyDate}`;
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }

  const bundles: NoteBundle[] = [];
  for (const [, group] of map) {
    const first = group[0];
    const bundleId = `bundle_${first.folderId}_${first.studyDate}`;
    const pages = group
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((it, i) => itemToPage(it, bundleId, i));
    const review: ReviewCycleState = {
      reviewScheduleId: first.reviewScheduleId,
      reviewAnchorDate: first.reviewAnchorDate,
      reviewStepIndex: first.reviewStepIndex,
      lastReviewedAt: first.lastReviewedAt,
      nextReviewAt: null,
      aiScoreLast: null,
    };
    bundles.push({
      id: bundleId,
      subjectId: first.folderId,
      studyDate: first.studyDate,
      title: first.studyDate,
      pageIds: pages.map((p) => p.id),
      pages,
      archived: first.archived ?? false,
      archivedAt: null,
      review,
      createdAt: first.createdAt,
      updatedAt: new Date().toISOString(),
    });
  }
  return bundles;
}

export function migrateToV4(raw: unknown): AppData {
  const legacy = raw as LegacyData;
  if (legacy.bundles?.length) {
    return {
      ...DEFAULT_DATA,
      ...legacy,
      version: 4,
      settings: { ...DEFAULT_DATA.settings, ...legacy.settings },
    } as AppData;
  }

  const subjects: SubjectFolder[] = (legacy.subjects ?? legacy.folders ?? []).map((f, i) => ({
    id: f.id,
    name: f.name,
    reviewScheduleId: f.reviewScheduleId,
    color: f.color ?? theme.gray,
    sortOrder: i,
    createdAt: f.createdAt ?? new Date().toISOString(),
  }));

  const items = legacy.items ?? [];
  const bundles = groupItemsIntoBundles(items);

  const base: AppData = {
    version: 4,
    subjects: subjects.length ? subjects : DEFAULT_DATA.subjects,
    schedules: legacy.schedules?.length ? legacy.schedules : DEFAULT_SCHEDULES,
    bundles,
    trash: legacy.trash ?? [],
    settings: {
      ...DEFAULT_DATA.settings,
      ...legacy.settings,
      tier: legacy.settings?.tier ?? 'free',
      photoLimit: legacy.settings?.photoLimit ?? theme.limits.freeImages,
      memoLimit: legacy.settings?.memoLimit ?? theme.limits.freeMemos,
      activeScheduleIds:
        legacy.settings?.activeScheduleIds ?? DEFAULT_DATA.settings.activeScheduleIds,
      cloudBackupEnabled: legacy.settings?.cloudBackupEnabled ?? true,
      lastCloudSyncAt: legacy.settings?.lastCloudSyncAt ?? null,
      defaultSlideshowSeconds: legacy.settings?.defaultSlideshowSeconds ?? 10,
      firstLaunchDate: legacy.settings?.firstLaunchDate,
    },
  };

  return {
    ...base,
    settings: {
      ...base.settings,
      firstLaunchDate: inferFirstLaunchDate(base),
    },
  };
}
