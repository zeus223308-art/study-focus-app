import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ResolvedImage } from '@/components/ui/ResolvedImage';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useApp, useLanguage } from '@/context/AppContext';
import type { NotePage, TrashLifecycle } from '@/lib/domain/types';
import { getPreviewImageUri } from '@/lib/files/display-image-uri';
import { formatTrashDeadline } from '@/lib/ui/format-study-date';
import {
  canRestoreFromBackup,
  filterActiveTrash,
  isTrashEntryWithPhotos,
  trashRemaining,
} from '@/lib/trash/lifecycle';

const COVER = 64;

type DeletedSubject = {
  subjectId: string;
  name: string;
  pages: NotePage[];
  deletedAt: string;
  backupExpiresAt: string;
};

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

export default function TrashScreen() {
  const { t } = useTranslation();
  const { data, restoreTrash, restoreSubjectTrash } = useApp();

  const { deletedSubjects, photoEntries } = useMemo(() => {
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
        // Soonest expiry drives the countdown (entries expire independently).
        if (entry.backupExpiresAt < group.backupExpiresAt) {
          group.backupExpiresAt = entry.backupExpiresAt;
        }
      } else if (isTrashEntryWithPhotos(entry)) {
        photos.push(entry);
      }
    }

    const byExpirySoonest = (a: { backupExpiresAt: string }, b: { backupExpiresAt: string }) =>
      new Date(a.backupExpiresAt).getTime() - new Date(b.backupExpiresAt).getTime();

    return {
      deletedSubjects: [...subjectMap.values()].sort(byExpirySoonest),
      photoEntries: photos.sort(byExpirySoonest),
    };
  }, [data.trash, data.subjects]);

  const isEmpty = deletedSubjects.length === 0 && photoEntries.length === 0;

  return (
    <Screen scroll>
      <ScreenHeader title="" showBack backFallback="/(tabs)/vault" showSettings={false} />
      <Text style={styles.pageTitle}>{t('trash.title')}</Text>
      <Text style={styles.notice}>{t('trash.autoDeleteHint')}</Text>

      {isEmpty ? (
        <Text style={styles.empty}>{t('trash.empty')}</Text>
      ) : (
        <>
          {deletedSubjects.length > 0 ? (
            <>
              <Text style={styles.sectionHeader}>{t('trash.subjectsHeader')}</Text>
              {deletedSubjects.map((group) => {
                const cover = group.pages[0] ? getPreviewImageUri(group.pages[0].asset) : null;
                return (
                  <View key={group.subjectId} style={styles.card}>
                    {cover ? (
                      <ResolvedImage uri={cover} asset={group.pages[0]!.asset} style={styles.cover} />
                    ) : (
                      <View style={[styles.cover, styles.thumbEmpty]} />
                    )}
                    <View style={styles.info}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {group.name}
                      </Text>
                      <Text style={styles.meta}>
                        {group.pages.length > 0
                          ? t('trash.subjectPages', { count: group.pages.length })
                          : t('trash.subjectEmpty')}
                      </Text>
                      <CountdownBlock backupExpiresAt={group.backupExpiresAt} />
                    </View>
                    <Pressable
                      onPress={() => restoreSubjectTrash(group.subjectId)}
                      hitSlop={8}
                      style={styles.restoreBtn}>
                      <Text style={styles.restore}>{t('trash.restoreSubject')}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </>
          ) : null}

          {photoEntries.length > 0 ? (
            <>
              <Text style={styles.sectionHeader}>{t('trash.photosHeader')}</Text>
              {photoEntries.map((entry) => {
                const pages = entry.bundleSnapshot.pages;
                const cover = pages[0] ? getPreviewImageUri(pages[0].asset) : null;
                return (
                  <View key={entry.id} style={styles.card}>
                    {cover ? (
                      <ResolvedImage uri={cover} asset={pages[0]!.asset} style={styles.cover} />
                    ) : (
                      <View style={[styles.cover, styles.thumbEmpty]} />
                    )}
                    <View style={styles.info}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {entry.subjectSnapshot?.name ?? t('trash.photosHeader')}
                      </Text>
                      <Text style={styles.meta}>{t('trash.subjectPages', { count: pages.length })}</Text>
                      <CountdownBlock backupExpiresAt={entry.backupExpiresAt} />
                    </View>
                    <Pressable
                      onPress={() => restoreTrash(entry.id)}
                      hitSlop={8}
                      style={styles.restoreBtn}
                      accessibilityRole="button"
                      accessibilityLabel={t('trash.restorePhoto')}>
                      <Text style={styles.restore}>{t('trash.restorePhoto')}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: theme.black,
    letterSpacing: -0.5,
    marginTop: 4,
    marginBottom: 6,
  },
  notice: { fontSize: 13, color: theme.gray, lineHeight: 19, marginBottom: 22 },
  empty: { color: theme.gray, textAlign: 'center', marginTop: 40 },
  sectionHeader: {
    fontSize: theme.font.bodySmall,
    fontWeight: '800',
    color: theme.black,
    marginBottom: 10,
    marginTop: 4,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.grayLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  info: { flex: 1, minWidth: 0, gap: 4 },
  itemName: { fontSize: 16, fontWeight: '800', color: theme.black },
  meta: { fontSize: 12, color: theme.graySecondary },
  countdown: { marginTop: 2, gap: 3 },
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
  deadline: { fontSize: 11, color: theme.grayMuted, fontWeight: '600' },
  cover: { width: COVER, height: COVER, borderRadius: 10, flexShrink: 0 },
  thumbEmpty: { backgroundColor: theme.grayLight },
  restoreBtn: {
    flexShrink: 0,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.gray,
    backgroundColor: theme.surface,
  },
  restore: { color: theme.black, fontWeight: '700', fontSize: 13 },
});
