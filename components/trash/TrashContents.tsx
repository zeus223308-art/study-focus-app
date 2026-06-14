import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { settingsGroupStyles } from '@/components/SettingsGroup';
import { TrashCoverImage, TRASH_COVER_SIZE } from '@/components/trash/TrashCoverImage';
import { WEB_LINE } from '@/lib/ui/web-divider';
import { theme } from '@/constants/theme';
import { useApp, useLanguage } from '@/context/AppContext';
import type { NotePage, TrashLifecycle } from '@/lib/domain/types';
import { formatTrashDeadline } from '@/lib/ui/format-study-date';
import {
  canRestoreFromBackup,
  filterActiveTrash,
  isTrashEntryWithPhotos,
  trashRemaining,
} from '@/lib/trash/lifecycle';

const TRASH_INNER_PAD = 16;

type TrashCoverRef = { bundleId: string; page: NotePage };

type DeletedSubject = {
  subjectId: string;
  name: string;
  pages: NotePage[];
  cover: TrashCoverRef | null;
  deletedAt: string;
  backupExpiresAt: string;
};

/** Computes restorable trash, grouped into deleted subjects and photo entries. */
export function useTrashContents() {
  const { data } = useApp();
  return useMemo(() => {
    const active = filterActiveTrash(data.trash).filter((e) => canRestoreFromBackup(e));
    const existing = new Set(data.subjects.map((s) => s.id));
    const subjectMap = new Map<string, DeletedSubject>();
    const photos: TrashLifecycle[] = [];

    for (const entry of active) {
      const snapId = entry.subjectSnapshot?.id;
      const isDeletedSubject = Boolean(snapId && !existing.has(snapId));
      if (isDeletedSubject && entry.subjectSnapshot) {
        let group = subjectMap.get(entry.subjectSnapshot.id);
        if (!group) {
          group = {
            subjectId: entry.subjectSnapshot.id,
            name: entry.subjectSnapshot.name,
            pages: [],
            cover: null,
            deletedAt: entry.deletedAt,
            backupExpiresAt: entry.backupExpiresAt,
          };
          subjectMap.set(entry.subjectSnapshot.id, group);
        }
        for (const page of entry.bundleSnapshot.pages) group.pages.push(page);
        if (!group.cover && entry.bundleSnapshot.pages[0]) {
          group.cover = {
            bundleId: entry.bundleSnapshot.id,
            page: entry.bundleSnapshot.pages[0],
          };
        }
        if (entry.deletedAt > group.deletedAt) group.deletedAt = entry.deletedAt;
        if (entry.backupExpiresAt < group.backupExpiresAt) {
          group.backupExpiresAt = entry.backupExpiresAt;
        }
      } else if (isTrashEntryWithPhotos(entry)) {
        photos.push(entry);
      }
    }

    const byExpirySoonest = (a: { backupExpiresAt: string }, b: { backupExpiresAt: string }) =>
      new Date(a.backupExpiresAt).getTime() - new Date(b.backupExpiresAt).getTime();

    const deletedSubjects = [...subjectMap.values()].sort(byExpirySoonest);
    const photoEntries = photos.sort(byExpirySoonest);
    return {
      deletedSubjects,
      photoEntries,
      isEmpty: deletedSubjects.length === 0 && photoEntries.length === 0,
      count: deletedSubjects.length + photoEntries.length,
    };
  }, [data.trash, data.subjects]);
}

/** Remaining-time chip + restore-by deadline shown next to each entry. */
function CountdownBlock({ backupExpiresAt }: { backupExpiresAt: string }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const rem = trashRemaining(backupExpiresAt);
  const urgent = rem.days === 0;

  const remainingText =
    rem.days > 0
      ? t('trash.remainDays', { days: rem.days, hours: rem.hours })
      : rem.hours > 0
        ? t('trash.remainHours', { hours: rem.hours })
        : t('trash.remainMinutes', { minutes: rem.minutes });

  return (
    <View style={styles.countdown}>
      <View style={[styles.remainChip, urgent && styles.remainChipUrgent]}>
        <Text style={[styles.remainText, urgent && styles.remainTextUrgent]}>{remainingText}</Text>
      </View>
      <Text style={styles.deadline}>
        {t('trash.restoreBy', { date: formatTrashDeadline(rem.expiresAt, language) })}
      </Text>
    </View>
  );
}

type TrashRowProps = {
  cover?: TrashCoverRef | null;
  name: string;
  meta: string;
  backupExpiresAt: string;
  restoreLabel: string;
  onRestore: () => void;
  last?: boolean;
};

function TrashRow({
  cover,
  name,
  meta,
  backupExpiresAt,
  restoreLabel,
  onRestore,
  last,
}: TrashRowProps) {
  return (
    <View style={styles.rowOuter}>
      <View style={[styles.rowInner, !last && settingsGroupStyles.rowBorder]}>
        {cover ? (
          <TrashCoverImage
            bundleId={cover.bundleId}
            pageId={cover.page.id}
            asset={cover.page.asset}
          />
        ) : (
          <View style={styles.coverEmpty} />
        )}
        <View style={styles.info}>
          <Text style={styles.itemName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.meta}>{meta}</Text>
          <CountdownBlock backupExpiresAt={backupExpiresAt} />
        </View>
        <Pressable onPress={onRestore} hitSlop={8} style={styles.restoreBtn} accessibilityRole="button">
          <Text style={styles.restore}>{restoreLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

type Props = {
  /** Show the 3-day permanent-deletion notice above the list. */
  showNotice?: boolean;
};

/** Shared trash list (deleted subjects + photos) with inline restore. */
export function TrashContents({ showNotice = true }: Props) {
  const { t } = useTranslation();
  const { restoreTrash, restoreSubjectTrash } = useApp();
  const { deletedSubjects, photoEntries, isEmpty } = useTrashContents();

  const subjectRows = deletedSubjects.map((group, index) => {
    const isLastInSection = index === deletedSubjects.length - 1 && photoEntries.length === 0;
    return (
      <TrashRow
        key={group.subjectId}
        cover={group.cover}
        name={group.name}
        meta={
          group.pages.length > 0
            ? t('trash.subjectPages', { count: group.pages.length })
            : t('trash.subjectEmpty')
        }
        backupExpiresAt={group.backupExpiresAt}
        restoreLabel={t('trash.restoreSubject')}
        onRestore={() => restoreSubjectTrash(group.subjectId)}
        last={isLastInSection}
      />
    );
  });

  const photoRows = photoEntries.map((entry, index) => {
    const pages = entry.bundleSnapshot.pages;
    const cover =
      pages[0] != null
        ? { bundleId: entry.bundleSnapshot.id, page: pages[0] }
        : null;
    return (
      <TrashRow
        key={entry.id}
        cover={cover}
        name={entry.subjectSnapshot?.name ?? t('trash.photosHeader')}
        meta={t('trash.subjectPages', { count: pages.length })}
        backupExpiresAt={entry.backupExpiresAt}
        restoreLabel={t('trash.restorePhoto')}
        onRestore={() => restoreTrash(entry.id)}
        last={index === photoEntries.length - 1}
      />
    );
  });

  return (
    <>
      {showNotice ? <Text style={styles.notice}>{t('trash.autoDeleteHint')}</Text> : null}

      {isEmpty ? (
        <Text style={styles.empty}>{t('trash.empty')}</Text>
      ) : (
        <>
          {deletedSubjects.length > 0 ? (
            <>
              <Text style={styles.sectionHeader}>{t('trash.subjectsHeader')}</Text>
              {subjectRows}
            </>
          ) : null}

          {photoEntries.length > 0 ? (
            <>
              <Text
                style={[
                  styles.sectionHeader,
                  deletedSubjects.length > 0 && styles.sectionHeaderSpaced,
                ]}>
                {t('trash.photosHeader')}
              </Text>
              {photoRows}
            </>
          ) : null}
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  notice: {
    fontSize: 13,
    color: theme.gray,
    lineHeight: 19,
    paddingHorizontal: TRASH_INNER_PAD,
    paddingTop: 12,
    paddingBottom: 8,
  },
  empty: {
    color: theme.gray,
    textAlign: 'center',
    paddingVertical: 24,
    paddingHorizontal: TRASH_INNER_PAD,
  },
  sectionHeader: {
    ...settingsGroupStyles.title,
    paddingHorizontal: TRASH_INNER_PAD,
    paddingTop: 4,
    paddingBottom: 2,
    marginBottom: 0,
    marginLeft: 0,
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: theme.font.bodySmall,
    fontWeight: '800',
    color: theme.black,
  },
  sectionHeaderSpaced: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: WEB_LINE,
    borderTopColor: theme.grayLight,
  },
  rowOuter: {
    width: '100%',
    paddingHorizontal: TRASH_INNER_PAD,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    width: '100%',
    minWidth: 0,
  },
  coverEmpty: {
    width: TRASH_COVER_SIZE,
    height: TRASH_COVER_SIZE,
    borderRadius: 8,
    flexShrink: 0,
    backgroundColor: theme.grayLight,
  },
  info: { flex: 1, minWidth: 0, gap: 4, alignItems: 'flex-start' },
  itemName: {
    width: '100%',
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.black,
    textAlign: 'left',
  },
  meta: {
    width: '100%',
    fontSize: theme.font.caption,
    color: theme.gray,
    textAlign: 'left',
  },
  countdown: { alignSelf: 'stretch', marginTop: 2, gap: 3 },
  remainChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.grayLight,
  },
  remainChipUrgent: { backgroundColor: 'rgba(248, 113, 113, 0.18)' },
  remainText: { fontSize: 12, fontWeight: '800', color: theme.gray },
  remainTextUrgent: { color: theme.danger },
  deadline: {
    width: '100%',
    fontSize: 11,
    color: theme.grayMuted,
    fontWeight: '600',
    textAlign: 'left',
  },
  restoreBtn: {
    flexShrink: 0,
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.grayLight,
    backgroundColor: theme.beige,
  },
  restore: { color: theme.black, fontWeight: '700', fontSize: theme.font.caption },
});
