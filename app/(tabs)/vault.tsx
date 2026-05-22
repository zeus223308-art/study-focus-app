import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { groupItemsByDate } from '@/lib/grouping';

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];

export default function FilesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, addFolder } = useApp();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const activeItems = data.items.filter((i) => !i.archived);

  const confirmAdd = () => {
    if (!newName.trim()) return;
    const scheduleId = data.settings.activeScheduleIds[0] ?? data.schedules[0].id;
    addFolder(newName, scheduleId);
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
            <Text style={styles.searchLink}>{t('item.search')}</Text>
          </Pressable>
        }
      />

      <View style={styles.albumGrid}>
        {data.folders.map((folder, index) => {
          const items = activeItems.filter((i) => i.folderId === folder.id);
          const stacks = groupItemsByDate(items);
          const preview = items[0];

          return (
            <Pressable
              key={folder.id}
              style={styles.albumCard}
              onPress={() => router.push(`/folder/${folder.id}`)}>
              <View style={styles.albumTop}>
                <Text style={styles.circled}>{CIRCLED[index] ?? `${index + 1}`}</Text>
                <Text style={styles.folderName}>{folder.name}</Text>
              </View>
              <View style={styles.thumbRow}>
                {preview ? (
                  <Image source={{ uri: preview.imageUri }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbEmpty]} />
                )}
                {stacks.length > 0 && (
                  <View style={styles.dateList}>
                    {stacks.slice(0, 3).map((s) => (
                      <Text key={s.studyDate} style={styles.dateLine}>
                        {s.studyDate.slice(5).replace('-', '/')} · {s.items.length}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {adding ? (
        <View style={styles.addBox}>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder={t('vault.addFolder')}
            style={styles.input}
            autoFocus
          />
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
        <Pressable onPress={() => setAdding(true)} style={styles.addRow}>
          <Text style={styles.addLabel}>+ {t('vault.addFolder')}</Text>
        </Pressable>
      )}

      <Pressable style={styles.trashLink} onPress={() => router.push('/trash')}>
        <Text style={styles.trashText}>{t('trash.title')}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchLink: { fontSize: 15, color: theme.accent, fontWeight: '600' },
  albumGrid: { gap: 12 },
  albumCard: {
    backgroundColor: theme.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.grayLight,
    ...theme.cardShadow,
  },
  albumTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  circled: { fontSize: 18, marginRight: 10, color: theme.black },
  folderName: { fontSize: 20, fontWeight: '700', color: theme.black },
  thumbRow: { flexDirection: 'row', alignItems: 'center' },
  thumb: { width: 56, height: 72, borderRadius: 8, backgroundColor: theme.grayLight },
  thumbEmpty: { borderWidth: 1, borderColor: theme.grayLight, borderStyle: 'dashed' },
  dateList: { marginLeft: 14, flex: 1 },
  dateLine: { fontSize: 13, color: theme.gray, marginBottom: 4 },
  addBox: {
    marginTop: 16,
    backgroundColor: theme.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.grayLight,
  },
  input: { fontSize: 16, color: theme.black },
  addActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 12 },
  cancel: { color: theme.gray },
  save: { color: theme.accent, fontWeight: '700' },
  addRow: { marginTop: 16, padding: 12 },
  addLabel: { color: theme.gray, fontWeight: '600' },
  trashLink: { marginTop: 20, marginBottom: 40 },
  trashText: { color: theme.gray, fontSize: 14 },
});
