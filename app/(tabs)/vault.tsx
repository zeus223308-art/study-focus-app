import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

export default function VaultScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, addFolder, photoCount } = useApp();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const activeItems = data.items.filter((i) => !i.archived);

  const confirmAdd = () => {
    if (!newName.trim()) return;
    addFolder(newName, data.schedules[0]?.id ?? 'sched_1357');
    setNewName('');
    setAdding(false);
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>{t('vault.title')}</Text>
        <Pressable onPress={() => router.push('/search')}>
          <Text style={styles.link}>{t('item.search')}</Text>
        </Pressable>
      </View>

      <View style={styles.folderGrid}>
        {data.folders.map((folder) => {
          const count = activeItems.filter((i) => i.folderId === folder.id).length;
          return (
            <Pressable
              key={folder.id}
              style={styles.folderCard}
              onPress={() => router.push(`/folder/${folder.id}`)}>
              <Text style={styles.folderName}>{folder.name}</Text>
              <Text style={styles.folderCount}>{t('vault.photos', { count })}</Text>
            </Pressable>
          );
        })}
        <Pressable style={[styles.folderCard, styles.addCard]} onPress={() => setAdding(true)}>
          <Text style={styles.addText}>+ {t('vault.addFolder')}</Text>
        </Pressable>
      </View>

      {adding && (
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
      )}

      <Pressable style={styles.trashLink} onPress={() => router.push('/trash')}>
        <Text style={styles.trashText}>{t('trash.title')}</Text>
      </Pressable>

      <Pressable style={styles.fab} onPress={() => router.push('/capture')}>
        <Text style={styles.fabText}>📷</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: theme.black },
  link: { fontSize: 15, color: theme.accent, fontWeight: '600' },
  folderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 20 },
  folderCard: {
    width: '47%',
    backgroundColor: theme.white,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.grayLight,
    minHeight: 100,
    justifyContent: 'center',
  },
  folderName: { fontSize: 20, fontWeight: '700', color: theme.black },
  folderCount: { fontSize: 13, color: theme.gray, marginTop: 6 },
  addCard: { borderStyle: 'dashed', alignItems: 'center' },
  addText: { fontSize: 15, color: theme.gray, fontWeight: '600' },
  addBox: {
    marginTop: 16,
    backgroundColor: theme.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.grayLight,
  },
  input: { fontSize: 16, color: theme.black, paddingVertical: 8 },
  addActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 8 },
  cancel: { color: theme.gray },
  save: { color: theme.accent, fontWeight: '700' },
  trashLink: { marginTop: 24 },
  trashText: { color: theme.gray, fontSize: 14 },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: { fontSize: 24 },
});
