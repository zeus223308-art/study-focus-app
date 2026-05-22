import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ReviewCalendar } from '@/components/ReviewCalendar';
import { Button } from '@/components/ui/Button';
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

  return (
    <Screen scroll>
      <Text style={styles.title}>{t('dashboard.title')}</Text>
      <Text style={styles.sub}>
        {dueToday.length > 0
          ? t('dashboard.dueCount', { count: dueToday.length })
          : t('dashboard.empty')}
      </Text>

      {dueToday.length > 0 && (
        <>
          <View style={styles.chips}>
            {Array.from(byFolder.entries()).map(([folderId, count]) => {
              const folder = data.folders.find((f) => f.id === folderId);
              return (
                <View key={folderId} style={styles.chip}>
                  <View style={styles.chipDot} />
                  <Text style={styles.chipText}>
                    {folder?.name} · {count}
                  </Text>
                </View>
              );
            })}
          </View>
          <Button
            label={t('dashboard.startReview')}
            onPress={() => router.push('/review/session')}
            style={{ marginTop: 16 }}
          />
        </>
      )}

      <Text style={styles.section}>{t('dashboard.calendarHint')}</Text>
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
  title: { fontSize: 28, fontWeight: '700', color: theme.black },
  sub: { fontSize: 15, color: theme.gray, marginTop: 6, marginBottom: 20 },
  section: { fontSize: 14, fontWeight: '600', color: theme.gray, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.grayLight,
  },
  chipDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.accent, marginRight: 8 },
  chipText: { fontSize: 14, color: theme.black, fontWeight: '500' },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: { color: theme.white, fontSize: 28, fontWeight: '300', marginTop: -2 },
});
