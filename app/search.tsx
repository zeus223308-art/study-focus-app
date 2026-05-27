import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ResolvedImage } from '@/components/ui/ResolvedImage';

import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { getPreviewImageUri } from '@/lib/files/display-image-uri';
import { searchBundles } from '@/lib/grouping/bundles';

export default function SearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data } = useApp();
  const [query, setQuery] = useState('');
  const [examOnly, setExamOnly] = useState(false);

  const results = searchBundles(data.bundles, query, examOnly);

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
      ]}>
      <ScreenHeader
        title={t('item.search')}
        showBack
        backFallback="/(tabs)/vault"
        showSettings={false}
      />
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
          {examOnly ? `${t('common.check')} ` : ''}
          {t('item.tagExam')}
        </Text>
      </Pressable>
      <FlatList
        data={results}
        keyExtractor={(b) => b.id}
        renderItem={({ item: bundle }) => {
          const cover = getPreviewImageUri(bundle.pages[0]?.asset);
          return (
            <Pressable
              style={styles.row}
              onPress={() => router.push({ pathname: '/bundle/[id]', params: { id: bundle.id } })}>
              {cover ? (
                <ResolvedImage uri={cover} asset={bundle.pages[0]?.asset} style={styles.thumb} />
              ) : null}
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
  root: { flex: 1, backgroundColor: theme.beige, paddingHorizontal: 20 },
  input: {
    backgroundColor: theme.surface,
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
    backgroundColor: theme.surface,
    borderRadius: 10,
    marginBottom: 8,
    alignItems: 'center',
  },
  thumb: { width: 48, height: 48, borderRadius: 6, marginRight: 12 },
  date: { fontWeight: '600', color: theme.black },
  note: { color: theme.gray, fontSize: 13, marginTop: 2 },
});
