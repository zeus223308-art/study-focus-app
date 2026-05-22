import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ReviewCalendar } from '@/components/ReviewCalendar';
import { SubjectReviewCard } from '@/components/SubjectReviewCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, dueToday, getSchedule } = useApp();

  const byFolder = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of dueToday) {
      map.set(item.folderId, (map.get(item.folderId) ?? 0) + 1);
    }
    return map;
  }, [dueToday]);

  const folderEntries = Array.from(byFolder.entries())
    .map(([folderId, count]) => {
      const folder = data.folders.find((f) => f.id === folderId);
      return folder ? { folder, count } : null;
    })
    .filter(Boolean) as { folder: (typeof data.folders)[0]; count: number }[];

  const pairs: typeof folderEntries[] = [];
  for (let i = 0; i < folderEntries.length; i += 2) {
    pairs.push(folderEntries.slice(i, i + 2));
  }

  return (
    <Screen scroll>
      <ScreenHeader title={t('dashboard.title')} showSettings />

      {pairs.length === 0 ? (
        <Text style={styles.empty}>{t('dashboard.empty')}</Text>
      ) : (
        pairs.map((row, ri) => (
          <View key={ri} style={styles.cardRow}>
            {row.map(({ folder, count }) => (
              <SubjectReviewCard
                key={folder.id}
                name={folder.name}
                count={count}
                color={folder.color}
                totalLabel={t('dashboard.totalPages', { count })}
                onPress={() => router.push('/review/session')}
              />
            ))}
            {row.length === 1 && <View style={styles.cardSpacer} />}
          </View>
        ))
      )}

      {dueToday.length > 0 && (
        <Pressable style={styles.startBtn} onPress={() => router.push('/review/session')}>
          <Text style={styles.startText}>{t('dashboard.startReview')}</Text>
        </Pressable>
      )}

      <ReviewCalendar
        items={data.items.filter((i) => !i.archived)}
        folders={data.folders}
        getSchedule={getSchedule}
      />

      <Pressable style={styles.fab} onPress={() => router.push('/capture')}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: 15, color: theme.gray, marginBottom: 24 },
  cardRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  cardSpacer: { flex: 1 },
  startBtn: {
    alignSelf: 'center',
    marginVertical: 16,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 24,
    backgroundColor: theme.accent,
  },
  startText: { color: theme.white, fontWeight: '700', fontSize: 15 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: { color: theme.white, fontSize: 28, fontWeight: '300' },
});
