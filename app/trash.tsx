import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ResolvedImage } from '@/components/ui/ResolvedImage';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import type { NotePage, TrashLifecycle } from '@/lib/domain/types';
import { getPreviewImageUri } from '@/lib/files/display-image-uri';
import {
  canRestoreFromBackup,
  filterActiveTrash,
  isTrashEntryWithPhotos,
} from '@/lib/trash/lifecycle';

const THUMB = 56;
const THUMB_GAP = 8;

type DeletedSubject = {
  subjectId: string;
  name: string;
  pages: NotePage[];
  deletedAt: string;
};

function Thumbs({ pages }: { pages: NotePage[] }) {
  return (
    <View style={styles.thumbRow}>
      {pages.map((page) => {
        const cover = getPreviewImageUri(page.asset);
        return (
          <View key={page.id} style={styles.thumbSlot}>
            {cover ? (
              <ResolvedImage uri={cover} asset={page.asset} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbEmpty]} />
            )}
          </View>
        );
      })}
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
          };
          subjectMap.set(entry.subjectSnapshot.id, group);
        }
        for (const page of entry.bundleSnapshot.pages) group.pages.push(page);
        if (entry.deletedAt > group.deletedAt) group.deletedAt = entry.deletedAt;
      } else if (isTrashEntryWithPhotos(entry)) {
        photos.push(entry);
      }
    }

    const byDeletedDesc = (a: { deletedAt: string }, b: { deletedAt: string }) =>
      new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime();

    return {
      deletedSubjects: [...subjectMap.values()].sort(byDeletedDesc),
      photoEntries: photos.sort(byDeletedDesc),
    };
  }, [data.trash, data.subjects]);

  const isEmpty = deletedSubjects.length === 0 && photoEntries.length === 0;

  return (
    <Screen scroll>
      <ScreenHeader
        title={t('trash.title')}
        showBack
        backFallback="/(tabs)/vault"
        showSettings={false}
      />
      <Text style={styles.hint}>{t('trash.autoDeleteHint')}</Text>

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
                  <View key={group.subjectId} style={styles.row}>
                    {cover ? (
                      <ResolvedImage uri={cover} asset={group.pages[0]!.asset} style={styles.cover} />
                    ) : (
                      <View style={[styles.cover, styles.thumbEmpty]} />
                    )}
                    <View style={styles.cardTitleBlock}>
                      <Text style={styles.subjectName} numberOfLines={1}>
                        {group.name}
                      </Text>
                      <Text style={styles.meta}>
                        {group.pages.length > 0
                          ? t('trash.subjectPages', { count: group.pages.length })
                          : t('trash.subjectEmpty')}
                      </Text>
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
              {photoEntries.map((entry) => (
                <View key={entry.id} style={styles.row}>
                  <Thumbs pages={entry.bundleSnapshot.pages} />
                  <Pressable
                    onPress={() => restoreTrash(entry.id)}
                    hitSlop={8}
                    style={styles.restoreBtn}
                    accessibilityRole="button"
                    accessibilityLabel={t('trash.restore')}>
                    <Text style={styles.restore}>{t('trash.restore')}</Text>
                  </Pressable>
                </View>
              ))}
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 13, color: theme.gray, marginTop: 6, marginBottom: 20 },
  empty: { color: theme.gray, textAlign: 'center', marginTop: 40 },
  sectionHeader: {
    fontSize: theme.font.bodySmall,
    fontWeight: '800',
    color: theme.black,
    marginBottom: 10,
    marginTop: 4,
  },
  cardTitleBlock: { flex: 1, minWidth: 0 },
  subjectName: { fontSize: 17, fontWeight: '800', color: theme.black },
  meta: { fontSize: 13, color: theme.gray, marginTop: 4 },
  row: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.grayLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  thumbRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THUMB_GAP,
  },
  thumbSlot: { width: THUMB, height: THUMB },
  thumb: { width: THUMB, height: THUMB, borderRadius: 8 },
  cover: { width: THUMB, height: THUMB, borderRadius: 8, flexShrink: 0 },
  thumbEmpty: { backgroundColor: theme.grayLight },
  restoreBtn: {
    flexShrink: 0,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.orange,
    backgroundColor: theme.surface,
  },
  restore: { color: theme.orange, fontWeight: '700', fontSize: 14 },
});
