import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { DateRibbon } from '@/components/dashboard/DateRibbon';
import { PaywallSheet } from '@/components/paywall/PaywallSheet';
import { SubjectReviewCard } from '@/components/SubjectReviewCard';
import { SpringPressable } from '@/components/ui/SpringPressable';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    data,
    dueSelected,
    ribbonMarks,
    localToday,
    selectedDate,
    setSelectedDate,
    freemium,
    paywallVisible,
    setPaywallVisible,
  } = useApp();

  const display = dueSelected;

  const bySubject = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of display) {
      map.set(b.subjectId, (map.get(b.subjectId) ?? 0) + b.pages.length);
    }
    return map;
  }, [display]);

  const pairs = useMemo(() => {
    const entries = Array.from(bySubject.entries()).map(([subjectId, count]) => {
      const subject = data.subjects.find((s) => s.id === subjectId);
      return subject ? { subject, count } : null;
    }).filter(Boolean) as { subject: (typeof data.subjects)[0]; count: number }[];
    const rows: typeof entries[] = [];
    for (let i = 0; i < entries.length; i += 2) rows.push(entries.slice(i, i + 2));
    return rows;
  }, [bySubject, data.subjects]);

  return (
    <Screen scroll nestedScrollEnabled>
      <ScreenHeader title={t('dashboard.title')} showSettings={false} />
      <View style={styles.ribbonBlock}>
        <DateRibbon
          marks={ribbonMarks}
          selectedDate={selectedDate}
          firstLaunchDate={data.settings.firstLaunchDate}
          localToday={localToday}
          onSelectDate={setSelectedDate}
        />
      </View>

      {display.length === 0 ? (
        <Text style={styles.empty}>
          {selectedDate === localToday
            ? t('dashboard.empty')
            : t('dashboard.emptyDate', { date: selectedDate })}
        </Text>
      ) : (
        pairs.map((row, ri) => (
          <View key={ri} style={styles.cardRow}>
            {row.map(({ subject, count }) => (
              <SubjectReviewCard
                key={subject.id}
                name={subject.name}
                count={count}
                color={theme.gray}
                totalLabel={t('dashboard.totalPages', { count })}
                onPress={() => router.push({ pathname: '/review/session', params: { blackout: '1' } })}
              />
            ))}
            {row.length === 1 && <View style={styles.spacer} />}
          </View>
        ))
      )}

      {display.length > 0 && (
        <SpringPressable
          style={styles.startBtn}
          onPress={() => router.push({ pathname: '/review/session', params: { blackout: '1' } })}>
          <Text style={styles.startText}>{t('dashboard.startReview')}</Text>
        </SpringPressable>
      )}

      <PaywallSheet
        visible={paywallVisible}
        reason={freemium.reason ?? 'images'}
        used={freemium.reason === 'memos' ? freemium.usedMemos : freemium.usedImages}
        max={freemium.reason === 'memos' ? data.settings.memoLimit : data.settings.photoLimit}
        onClose={() => setPaywallVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  ribbonBlock: { marginBottom: 4 },
  empty: { fontSize: theme.font.body, fontWeight: '600', color: theme.gray, marginVertical: 24 },
  cardRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  spacer: { flex: 1 },
  startBtn: {
    alignSelf: 'center',
    marginVertical: 20,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.orange,
  },
  startText: { color: theme.white, fontWeight: '800', fontSize: theme.font.body },
});
