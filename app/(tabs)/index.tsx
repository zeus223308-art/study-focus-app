import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { DateRibbon } from '@/components/dashboard/DateRibbon';
import { PaywallSheet } from '@/components/paywall/PaywallSheet';
import { SubjectReviewCard } from '@/components/SubjectReviewCard';
import { SpringPressable } from '@/components/ui/SpringPressable';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { getBundlesFrontPreviews } from '@/lib/files/subject-previews';
import { useViewportLayout } from '@/lib/ui/viewport-layout';

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
  const viewport = useViewportLayout();

  const display = dueSelected;
  const [focusedSubjectId, setFocusedSubjectId] = useState<string | null>(null);

  useEffect(() => {
    if (display.length === 0) {
      setFocusedSubjectId(null);
      return;
    }
    if (!focusedSubjectId || !display.some((b) => b.subjectId === focusedSubjectId)) {
      setFocusedSubjectId(display[0].subjectId);
    }
  }, [display, focusedSubjectId]);

  const bySubject = useMemo(() => {
    const map = new Map<string, typeof display>();
    for (const b of display) {
      const list = map.get(b.subjectId) ?? [];
      list.push(b);
      map.set(b.subjectId, list);
    }
    return map;
  }, [display]);

  const pairs = useMemo(() => {
    const entries = Array.from(bySubject.entries())
      .map(([subjectId, bundles]) => {
        const subject = data.subjects.find((s) => s.id === subjectId);
        if (!subject) return null;
        const count = bundles.reduce((n, b) => n + b.pages.length, 0);
        return {
          subject,
          count,
          bundles,
          previews: getBundlesFrontPreviews(bundles),
        };
      })
      .filter(Boolean) as {
      subject: (typeof data.subjects)[0];
      count: number;
      bundles: typeof display;
      previews: ReturnType<typeof getBundlesFrontPreviews>;
    }[];
    const rows: typeof entries[] = [];
    const perRow = viewport.dashboardCardsPerRow;
    for (let i = 0; i < entries.length; i += perRow) rows.push(entries.slice(i, i + perRow));
    return rows;
  }, [bySubject, data.subjects, viewport.dashboardCardsPerRow]);

  const openReview = (subjectId?: string) => {
    router.push({
      pathname: '/review/session',
      params: subjectId ? { blackout: '1', subjectId } : { blackout: '1' },
    });
  };

  return (
    <Screen scroll nestedScrollEnabled>
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
          <View
            key={ri}
            style={viewport.dashboardCardsPerRow > 1 ? styles.cardRow : styles.cardRowSingle}>
            {row.map(({ subject, count, previews }) => (
              <SubjectReviewCard
                key={subject.id}
                subjectTag={subject.name}
                previewItems={previews}
                totalLabel={t('dashboard.totalPages', { count })}
                emptyHint={t('dashboard.previewEmpty')}
                selected={focusedSubjectId === subject.id}
                onFocus={() => setFocusedSubjectId(subject.id)}
                onPress={() => openReview(subject.id)}
              />
            ))}
            {row.length === 1 && viewport.dashboardCardsPerRow > 1 ? (
              <View style={styles.spacer} />
            ) : null}
          </View>
        ))
      )}

      {display.length > 0 && (
        <SpringPressable
          style={styles.startBtn}
          onPress={() => openReview(focusedSubjectId ?? undefined)}>
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
  cardRowSingle: { marginBottom: 12 },
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
