import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { SpringPressable } from '@/components/ui/SpringPressable';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { totalPagesInBundle } from '@/lib/grouping/bundles';

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];

export default function FilesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, addSubject } = useApp();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const confirmAdd = () => {
    if (!newName.trim()) return;
    addSubject(newName, data.settings.activeScheduleIds[0] ?? data.schedules[0].id);
    setNewName('');
    setAdding(false);
  };

  return (
    <Screen scroll>
      <ScreenHeader
        title={t('vault.title')}
        showSettings
        right={
          <Pressable onPress={() => router.push('/search')}>
            <Text style={styles.search}>{t('item.search')}</Text>
          </Pressable>
        }
      />

      <View style={styles.grid}>
        {data.subjects.map((subject, index) => {
          const bundles = data.bundles.filter((b) => b.subjectId === subject.id && !b.archived);
          const preview = bundles[0]?.pages[0];
          const pageCount = bundles.reduce((n, b) => n + totalPagesInBundle(b), 0);

          return (
            <SpringPressable
              key={subject.id}
              style={styles.card}
              onPress={() => router.push(`/folder/${subject.id}`)}>
              <View style={styles.cardTop}>
                <Text style={styles.circled}>{CIRCLED[index] ?? `${index + 1}`}</Text>
                <Text style={styles.name}>{subject.name}</Text>
              </View>
              <View style={styles.thumbRow}>
                {preview ? (
                  <Image source={{ uri: preview.asset.thumbnailUri }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbEmpty]} />
                )}
                <Text style={styles.meta}>{t('vault.photos', { count: pageCount })}</Text>
              </View>
            </SpringPressable>
          );
        })}
      </View>

      {adding ? (
        <View style={styles.addBox}>
          <TextInput value={newName} onChangeText={setNewName} style={styles.input} autoFocus />
          <View style={styles.addActions}>
            <Pressable onPress={() => setAdding(false)}>
              <Text style={styles.cancel}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable onPress={confirmAdd}>
              <Text style={styles.save}>{t('common.save')}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setAdding(true)}>
          <Text style={styles.addLabel}>+ {t('vault.addFolder')}</Text>
        </Pressable>
      )}

      <Pressable onPress={() => router.push('/trash')} style={{ marginTop: 24 }}>
        <Text style={styles.trash}>{t('trash.title')}</Text>
      </Pressable>

    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { fontSize: theme.font.bodySmall, color: theme.orange, fontWeight: '700' },
  grid: { gap: 12 },
  card: {
    backgroundColor: theme.white,
    borderRadius: theme.radius.md,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.grayLight,
    ...theme.cardShadow,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  circled: { fontSize: theme.font.body, fontWeight: '700', marginRight: 10 },
  name: { fontSize: theme.font.heading, fontWeight: '800' },
  thumbRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  thumb: { width: 52, height: 68, borderRadius: theme.radius.sm },
  thumbEmpty: { backgroundColor: theme.grayLight, borderStyle: 'dashed', borderWidth: 1 },
  meta: { fontSize: theme.font.caption, fontWeight: '600', color: theme.gray },
  addBox: {
    marginTop: 16,
    backgroundColor: theme.white,
    padding: 16,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.grayLight,
  },
  input: { fontSize: theme.font.body },
  addActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 12 },
  cancel: { color: theme.gray },
  save: { color: theme.orange, fontWeight: '800' },
  addLabel: { marginTop: 16, fontWeight: '700', color: theme.gray },
  trash: { color: theme.gray, fontSize: theme.font.caption },
});
