import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { settingsGroupStyles } from '@/components/SettingsGroup';
import { ResolvedImage } from '@/components/ui/ResolvedImage';
import { theme } from '@/constants/theme';
import { useApp, useLanguage } from '@/context/AppContext';
import type { NotePage, TrashLifecycle } from '@/lib/domain/types';
import { getPreviewImageUri } from '@/lib/files/display-image-uri';
import { formatTrashDeadline } from '@/lib/ui/format-study-date';
import { settingsRowPad, useViewportLayout } from '@/lib/ui/viewport-layout';
import {
  canRestoreFromBackup,
  filterActiveTrash,
  isTrashEntryWithPhotos,
  trashRemaining,
} from '@/lib/trash/lifecycle';

const COVER = 48;

type DeletedSubject = {
  subjectId: string;
  name: string;
  pages: NotePage[];
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
            deletedAt: entry.deletedAt,
            backupExpiresAt: entry.backupExpiresAt,
          };
          subjectMap.set(entry.subjectSnapshot.id, group);
        }
        for (const page of entry.bundleSnapshot.pages) group.pages.push(page);
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
  coverUri: string | null;
  coverAsset?: NotePage['asset'];
  name: string;
  meta: string;
  backupExpiresAt: string;
  restoreLabel: string;
  onRestore: () => void;
  rowPad: number;
  last?: boolean;
};

function TrashRow({
  coverUri,
  coverAsset,
  name,
  meta,
  backupExpiresAt,
  restoreLabel,
  onRestore,
  rowPad,
  last,
}: TrashRowProps) {
  return (
    <View
      style={[
        styles.row,
        { paddingHorizontal: rowPad },
        !last && settingsGroupStyles.rowBorder,
      ]}>
      <View style={styles.rowMain}>
        {coverUri ? (
          <ResolvedImage uri={coverUri} asset={coverAsset} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.thumbEmpty]} />
        )}
        <View style={styles.info}>
          <Text style={styles.itemName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.meta}>{meta}</Text>
          <CountdownBlock backupExpiresAt={backupExpiresAt} />
          <Pressable
            onPress={onRestore}
            hitSlop={8}
            style={styles.restoreBtn}
            accessibilityRole="button">
            <Text style={styles.restore}>{restoreLabel}</Text>
          </Pressable>
        </View>
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
  const viewport = useViewportLayout();
  const rowPad = settingsRowPad(viewport.isPhone);
  const { deletedSubjects, photoEntries, isEmpty } = useTrashContents();

  const subjectRows = deletedSubjects.map((group, index) => {
    const cover = group.pages[0] ? getPreviewImageUri(group.pages[0].asset) : null;
    const isLastInSection = index === deletedSubjects.length - 1 && photoEntries.length === 0;
    return (
      <TrashRow
        key={group.subjectId}
        rowPad={rowPad}
        coverUri={cover}
        coverAsset={group.pages[0]?.asset}
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
    const cover = pages[0] ? getPreviewImageUri(pages[0].asset) : null;
    return (
      <TrashRow
        key={entry.id}
        rowPad={rowPad}
        coverUri={cover}
        coverAsset={pages[0]?.asset}
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
      {showNotice ? (
        <Text style={[styles.notice, { paddingHorizontal: rowPad }]}>{t('trash.autoDeleteHint')}</Text>
      ) : null}

      {isEmpty ? (
        <Text style={[styles.empty, { paddingHorizontal: rowPad }]}>{t('trash.empty')}</Text>
      ) : (
        <>
          {deletedSubjects.length > 0 ? (
            <>
              <Text style={[styles.sectionHeader, { paddingHorizontal: rowPad }]}>
                {t('trash.subjectsHeader')}
              </Text>
              {subjectRows}
            </>
          ) : null}

          {photoEntries.length > 0 ? (
            <>
              <Text
                style={[
                  styles.sectionHeader,
                  { paddingHorizontal: rowPad },
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
    paddingTop: 12,
    paddingBottom: 8,
    textAlign: 'left',
  },
  empty: {
    color: theme.gray,
    textAlign: 'left',
    paddingVertical: 24,
  },
  sectionHeader: {
    fontSize: theme.font.bodySmall,
    fontWeight: '800',
    color: theme.black,
    paddingTop: 4,
    paddingBottom: 2,
    marginBottom: 0,
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  sectionHeaderSpaced: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.grayLight,
    marginTop: 4,
    paddingTop: 12,
  },
  row: {
    width: '100%',
    alignSelf: 'stretch',
    paddingVertical: 12,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    width: '100%',
    maxWidth: '100%',
  },
  info: { flex: 1, minWidth: 0, gap: 4, alignItems: 'flex-start' },
  itemName: { fontSize: theme.font.body, fontWeight: '600', color: theme.black, textAlign: 'left' },
  meta: { fontSize: theme.font.caption, color: theme.gray, textAlign: 'left' },
  countdown: { marginTop: 2, gap: 3, alignSelf: 'stretch' },
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
  deadline: { fontSize: 11, color: theme.grayMuted, fontWeight: '600', textAlign: 'left' },
  cover: { width: COVER, height: COVER, borderRadius: 8, flexShrink: 0 },
  thumbEmpty: { backgroundColor: theme.grayLight },
  restoreBtn: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.grayLight,
    backgroundColor: theme.beige,
  },
  restore: { color: theme.black, fontWeight: '700', fontSize: theme.font.caption },
});
