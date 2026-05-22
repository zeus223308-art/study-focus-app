import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { DateStackCard } from '@/components/DateStackCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { groupItemsByDate } from '@/lib/grouping';

export default function FolderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { data } = useApp();

  const folder = data.folders.find((f) => f.id === id);
  const stacks = useMemo(() => {
    const items = data.items.filter((i) => i.folderId === id && !i.archived);
    return groupItemsByDate(items);
  }, [data.items, id]);

  if (!folder) return null;

  return (
    <Screen padded={false}>
      <View style={styles.headerPad}>
        <ScreenHeader title={folder.name} />
      </View>
      {stacks.length === 0 ? (
        <Text style={styles.empty}>{t('folder.empty')}</Text>
      ) : (
        <FlatList
          data={stacks}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          keyExtractor={(s) => s.studyDate}
          renderItem={({ item: stack }) => (
            <DateStackCard
              stack={stack}
              onPress={() => {
                const first = stack.items[0];
                router.push(`/item/${first.id}`);
              }}
            />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerPad: { paddingHorizontal: 20 },
  empty: { textAlign: 'center', color: theme.gray, marginTop: 40, fontSize: 15 },
  list: { paddingHorizontal: 16 },
  row: { justifyContent: 'space-between' },
});
