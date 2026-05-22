import { useTranslation } from 'react-i18next';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { canRestoreFromBackup } from '@/lib/trash/lifecycle';

export default function TrashScreen() {
  const { t } = useTranslation();
  const { data, restoreTrash } = useApp();

  return (
    <Screen scroll>
      <Text style={styles.title}>{t('trash.title')}</Text>
      <Text style={styles.hint}>{t('trash.autoDeleteHint')}</Text>
      {data.trash.length === 0 ? (
        <Text style={styles.empty}>{t('trash.empty')}</Text>
      ) : (
        data.trash.map((entry) => {
          const cover = entry.bundleSnapshot.pages[0]?.asset.thumbnailUri;
          return (
            <View key={entry.id} style={styles.row}>
              {cover ? <Image source={{ uri: cover }} style={styles.thumb} /> : <View style={[styles.thumb, styles.thumbEmpty]} />}
              <View style={styles.meta}>
                <Text style={styles.date}>{entry.bundleSnapshot.studyDate}</Text>
                {canRestoreFromBackup(entry) && (
                  <Pressable onPress={() => restoreTrash(entry.id)}>
                    <Text style={styles.restore}>{t('trash.restore')}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', color: theme.black },
  hint: { fontSize: 13, color: theme.gray, marginTop: 6, marginBottom: 20 },
  empty: { color: theme.gray, textAlign: 'center', marginTop: 40 },
  row: {
    flexDirection: 'row',
    backgroundColor: theme.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.grayLight,
  },
  thumb: { width: 56, height: 56, borderRadius: 8 },
  thumbEmpty: { backgroundColor: theme.grayLight },
  meta: { marginLeft: 12, justifyContent: 'center' },
  date: { fontSize: 15, color: theme.black },
  restore: { color: theme.orange, fontWeight: '600', marginTop: 6 },
});
