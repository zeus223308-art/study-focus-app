import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ResolvedImage } from '@/components/ui/ResolvedImage';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { getPreviewImageUri } from '@/lib/files/display-image-uri';
import { groupTrashBySubject } from '@/lib/trash/group-trash';
import { canRestoreFromBackup } from '@/lib/trash/lifecycle';

const THUMB = 56;
const THUMB_GAP = 8;

export default function TrashScreen() {
  const { t } = useTranslation();
  const { data, restoreSubjectTrash } = useApp();

  const groups = useMemo(() => groupTrashBySubject(data.trash), [data.trash]);

  return (
    <Screen scroll>
      <ScreenHeader
        title={t('trash.title')}
        showBack
        backFallback="/(tabs)/vault"
        showSettings={false}
      />
      <Text style={styles.hint}>{t('trash.autoDeleteHint')}</Text>
      {groups.length === 0 ? (
        <Text style={styles.empty}>{t('trash.empty')}</Text>
      ) : (
        groups.map((group) => {
          const restorable = group.entries.some((e) => canRestoreFromBackup(e));
          return (
            <View key={group.subjectId} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleBlock}>
                  <Text style={styles.subjectName}>{group.subjectName}</Text>
                  <Text style={styles.meta}>
                    {group.pages.length > 0
                      ? t('trash.subjectPages', { count: group.pages.length })
                      : t('trash.subjectEmpty')}
                  </Text>
                </View>
                {restorable ? (
                  <Pressable
                    onPress={() => restoreSubjectTrash(group.subjectId)}
                    hitSlop={8}
                    style={styles.restoreBtn}>
                    <Text style={styles.restore}>{t('trash.restoreSubject')}</Text>
                  </Pressable>
                ) : null}
              </View>
              {group.pages.length > 0 ? (
                <View style={styles.thumbRow}>
                  {group.pages.map((page) => {
                    const cover = getPreviewImageUri(page.asset);
                    return (
                      <View key={page.id} style={styles.thumbSlot}>
                        {cover ? (
                          <ResolvedImage uri={cover} style={styles.thumb} />
                        ) : (
                          <View style={[styles.thumb, styles.thumbEmpty]} />
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 13, color: theme.gray, marginTop: 6, marginBottom: 20 },
  empty: { color: theme.gray, textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.grayLight,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  cardTitleBlock: { flex: 1, minWidth: 0 },
  subjectName: { fontSize: 17, fontWeight: '800', color: theme.black },
  meta: { fontSize: 13, color: theme.gray, marginTop: 4 },
  restoreBtn: { flexShrink: 0 },
  restore: { color: theme.orange, fontWeight: '700', fontSize: 14 },
  thumbRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THUMB_GAP,
  },
  thumbSlot: {
    width: THUMB,
    height: THUMB,
  },
  thumb: { width: THUMB, height: THUMB, borderRadius: 8 },
  thumbEmpty: { backgroundColor: theme.grayLight },
});
