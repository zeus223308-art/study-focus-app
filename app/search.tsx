import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ResolvedImage } from '@/components/ui/ResolvedImage';

import { TagFilterBar } from '@/components/files/TagFilterBar';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import type { NotePage } from '@/lib/domain/types';
import { getPreviewImageUri } from '@/lib/files/display-image-uri';
import { searchBundles } from '@/lib/grouping/bundles';
import { resolveTagColorFor } from '@/lib/ui/tag-colors';
import { useViewportLayout } from '@/lib/ui/viewport-layout';

export default function SearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data } = useApp();
  const { width: windowWidth } = useWindowDimensions();
  const viewport = useViewportLayout();
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [gridWidth, setGridWidth] = useState(0);

  const results = searchBundles(data.bundles, query);

  const colorForTag = useCallback(
    (tag: string) => resolveTagColorFor(tag, data.settings.tagColors, data.settings.tagColor),
    [data.settings.tagColors, data.settings.tagColor]
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const bundle of data.bundles) {
      if (bundle.archived) continue;
      for (const page of bundle.pages) {
        for (const tag of page.tags ?? []) {
          const trimmed = tag.trim();
          if (trimmed) set.add(trimmed);
        }
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [data.bundles]);

  const matchingPhotos = useMemo<{ bundleId: string; page: NotePage }[]>(() => {
    if (!activeTag) return [];
    const out: { bundleId: string; page: NotePage }[] = [];
    for (const bundle of data.bundles) {
      if (bundle.archived) continue;
      for (const page of bundle.pages) {
        if ((page.tags ?? []).some((tag) => tag.trim() === activeTag)) {
          out.push({ bundleId: bundle.id, page });
        }
      }
    }
    return out;
  }, [activeTag, data.bundles]);

  const gridCols = viewport.isPhone ? 3 : 4;
  const cellW = useMemo(() => {
    const w = gridWidth > 0 ? gridWidth : Math.max(280, windowWidth - 40);
    const gap = 8;
    return Math.floor((w - gap * (gridCols - 1)) / gridCols);
  }, [gridWidth, windowWidth, gridCols]);

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + 26, paddingBottom: insets.bottom + 16 },
      ]}>
      <ScreenHeader
        title={t('item.search')}
        showBack
        backFallback="/(tabs)/vault"
        showSettings={false}
        compactBottom
      />
      <TextInput
        style={styles.input}
        placeholder={t('item.search')}
        placeholderTextColor={theme.gray}
        value={query}
        onChangeText={setQuery}
        autoFocus
      />

      <TagFilterBar
        tags={allTags}
        colorForTag={colorForTag}
        activeTag={activeTag}
        onSelect={setActiveTag}
      />

      {activeTag ? (
        <ScrollView
          style={styles.results}
          contentContainerStyle={styles.resultsContent}
          showsVerticalScrollIndicator={false}
          onLayout={(e) => {
            const w = Math.round(e.nativeEvent.layout.width);
            if (w > 0 && w !== gridWidth) setGridWidth(w);
          }}>
          <Text style={styles.resultsTitle}>
            {t('vault.tagFilterCount', { tag: activeTag, count: matchingPhotos.length })}
          </Text>
          {matchingPhotos.length === 0 ? (
            <Text style={styles.resultsEmpty}>{t('vault.tagFilterEmpty')}</Text>
          ) : (
            <View style={styles.grid}>
              {matchingPhotos.map(({ bundleId, page }) => {
                const uri = getPreviewImageUri(page.asset);
                return (
                  <Pressable
                    key={page.id}
                    style={[styles.gridCell, { width: cellW, height: cellW }]}
                    onPress={() =>
                      router.push({
                        pathname: '/bundle/[id]',
                        params: { id: bundleId, pageId: page.id },
                      })
                    }>
                    {uri ? (
                      <ResolvedImage
                        uri={uri}
                        asset={page.asset}
                        style={styles.gridImg}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.gridImg, styles.gridEmpty]} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      ) : (
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
                  {bundle.title ? (
                    <Text style={styles.note} numberOfLines={1}>
                      {bundle.title}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          }}
        />
      )}
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
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
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
  results: { flex: 1, marginTop: 4 },
  resultsContent: { paddingBottom: 24 },
  resultsTitle: {
    fontSize: theme.font.bodySmall,
    fontWeight: '800',
    color: theme.black,
    marginBottom: 12,
  },
  resultsEmpty: { color: theme.gray, textAlign: 'center', marginVertical: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridCell: { borderRadius: 10, overflow: 'hidden', backgroundColor: theme.surface },
  gridImg: { width: '100%', height: '100%' },
  gridEmpty: { backgroundColor: theme.grayLight },
});
