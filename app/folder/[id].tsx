import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { groupBundlesByDate, totalPagesInBundle } from '@/lib/grouping/bundles';

export default function FolderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { data } = useApp();

  const subject = data.subjects.find((s) => s.id === id);
  const stacks = useMemo(
    () => groupBundlesByDate(data.bundles, id ?? ''),
    [data.bundles, id]
  );

  if (!subject) return null;

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <ScreenHeader title={subject.name} />
      </View>
      {stacks.length === 0 ? (
        <Text style={styles.empty}>{t('folder.empty')}</Text>
      ) : (
        <FlatList
          data={stacks}
          contentContainerStyle={styles.list}
          keyExtractor={(s) => s.studyDate}
          renderItem={({ item: stack }) => {
            const bundle = stack.bundles[0];
            const cover = bundle.pages[0];
            const count = stack.bundles.reduce((n, b) => n + totalPagesInBundle(b), 0);
            return (
              <Pressable
                style={styles.card}
                onPress={() => router.push({ pathname: '/bundle/[id]', params: { id: bundle.id } })}>
                <Image source={{ uri: cover.asset.thumbnailUri }} style={styles.thumb} />
                <View style={styles.meta}>
                  <Text style={styles.date}>{stack.studyDate}</Text>
                  <Text style={styles.count}>{count}장</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20 },
  empty: { textAlign: 'center', color: theme.gray, marginTop: 40 },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  card: {
    flexDirection: 'row',
    backgroundColor: theme.white,
    borderRadius: theme.radius.md,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.grayLight,
  },
  thumb: { width: 88, height: 110 },
  meta: { flex: 1, justifyContent: 'center', paddingHorizontal: 16 },
  date: { fontSize: theme.font.heading, fontWeight: '800' },
  count: { fontSize: theme.font.caption, color: theme.gray, marginTop: 6 },
});
