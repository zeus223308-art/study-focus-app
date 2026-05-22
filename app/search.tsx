import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { searchBundles } from '@/lib/grouping/bundles';

export default function SearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data } = useApp();
  const [query, setQuery] = useState('');
  const [examOnly, setExamOnly] = useState(false);

  const results = searchBundles(data.bundles, query, examOnly);

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
        keyExtractor={(b) => b.id}
        renderItem={({ item: bundle }) => {
          const cover = bundle.pages[0]?.asset.thumbnailUri;
          return (
            <Pressable
              style={styles.row}
              onPress={() => router.push({ pathname: '/bundle/[id]', params: { id: bundle.id } })}>
              {cover ? <Image source={{ uri: cover }} style={styles.thumb} /> : null}
              <View>
                <Text style={styles.date}>{bundle.studyDate}</Text>
                {bundle.title ? <Text style={styles.note} numberOfLines={1}>{bundle.title}</Text> : null}
              </View>
            </Pressable>
          );
        }}
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
  filterOn: { color: theme.orange },
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
