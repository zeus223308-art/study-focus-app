import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ResolvedImage } from '@/components/ui/ResolvedImage';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { getPreviewImageUri } from '@/lib/files/display-image-uri';
import { canRestoreFromBackup, filterActiveTrash, isTrashEntryWithPhotos } from '@/lib/trash/lifecycle';

const THUMB = 56;
const THUMB_GAP = 8;

export default function TrashScreen() {
  const { t } = useTranslation();
  const { data, restoreTrash } = useApp();

  const entries = useMemo(
    () =>
      filterActiveTrash(data.trash)
        .filter((e) => isTrashEntryWithPhotos(e) && canRestoreFromBackup(e))
        .sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()),
    [data.trash]
  );

  return (
    <Screen scroll>
      <ScreenHeader
        title={t('trash.title')}
        showBack
        backFallback="/(tabs)/vault"
        showSettings={false}
      />
      <Text style={styles.hint}>{t('trash.autoDeleteHint')}</Text>
      {entries.length === 0 ? (
        <Text style={styles.empty}>{t('trash.empty')}</Text>
      ) : (
        entries.map((entry) => (
          <View key={entry.id} style={styles.row}>
            <View style={styles.thumbRow}>
              {entry.bundleSnapshot.pages.map((page) => {
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
            <Pressable
              onPress={() => restoreTrash(entry.id)}
              hitSlop={8}
              style={styles.restoreBtn}
              accessibilityRole="button"
              accessibilityLabel={t('trash.restore')}>
              <Text style={styles.restore}>{t('trash.restore')}</Text>
            </Pressable>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 13, color: theme.gray, marginTop: 6, marginBottom: 20 },
  empty: { color: theme.gray, textAlign: 'center', marginTop: 40 },
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
