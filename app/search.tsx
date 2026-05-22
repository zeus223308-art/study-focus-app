import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { searchItems } from '@/lib/grouping';

export default function SearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data } = useApp();
  const [query, setQuery] = useState('');
  const [examOnly, setExamOnly] = useState(false);

  const results = searchItems(
    data.items.filter((i) => !i.archived),
    query,
    { examOnly: examOnly || undefined, tag: examOnly ? 'exam' : undefined }
  );

  return (
    <View style={styles.root}>
      <TextInput
        style={styles.input}
        placeholder={t('item.search')}
        placeholderTextColor={theme.gray}
        value={query}
        onChangeText={setQuery}
        autoFocus
      />
      <Pressable onPress={() => setExamOnly((e) => !e)} style={styles.filter}>
        <Text style={[styles.filterText, examOnly && styles.filterOn]}>
          {examOnly ? '✓ ' : ''}{t('item.tagExam')}
        </Text>
      </Pressable>
      <Text style={styles.soon}>{t('settings.ocrSoon')}</Text>
      <FlatList
        data={results}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/item/${item.id}`)}>
            <Image source={{ uri: item.imageUri }} style={styles.thumb} />
            <View>
              <Text style={styles.date}>{item.studyDate}</Text>
              {item.textNote ? <Text style={styles.note} numberOfLines={1}>{item.textNote}</Text> : null}
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.beige, padding: 20, paddingTop: 60 },
  input: {
    backgroundColor: theme.white,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: theme.black,
    borderWidth: 1,
    borderColor: theme.grayLight,
  },
  filter: { marginTop: 12, alignSelf: 'flex-start' },
  filterText: { color: theme.gray, fontWeight: '600' },
  filterOn: { color: theme.accent },
  soon: { fontSize: 12, color: theme.gray, marginVertical: 8 },
  row: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: theme.white,
    borderRadius: 10,
    marginBottom: 8,
    alignItems: 'center',
  },
  thumb: { width: 48, height: 48, borderRadius: 6, marginRight: 12 },
  date: { fontWeight: '600', color: theme.black },
  note: { color: theme.gray, fontSize: 13, marginTop: 2 },
});
