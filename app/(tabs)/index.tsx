import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import {
  DashboardReviewPicker,
  type DashboardSubjectEntry,
} from '@/components/dashboard/DashboardReviewPicker';
import { DashboardCalendar } from '@/components/dashboard/DashboardCalendar';
import { SpringPressable } from '@/components/ui/SpringPressable';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { getBundlesFrontPreviews } from '@/lib/files/subject-previews';
import { totalPagesInBundle } from '@/lib/grouping/bundles';
import { showMessage } from '@/lib/ui/confirm';

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
  } = useApp();

  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
  const [previewIndexBySubject, setPreviewIndexBySubject] = useState<Record<string, number>>(
    {}
  );

  const subjectEntries = useMemo((): DashboardSubjectEntry[] => {
    const dueIds = new Set(dueSelected.map((b) => b.id));
    return [...data.subjects]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((subject) => {
        const bundles = data.bundles.filter((b) => b.subjectId === subject.id && !b.archived);
        const dueBundles = bundles.filter((b) => dueIds.has(b.id));
        const totalPages = bundles.reduce((n, b) => n + totalPagesInBundle(b), 0);
        const duePages = dueBundles.reduce((n, b) => n + totalPagesInBundle(b), 0);
        return {
          subject,
          totalPages,
          duePages,
          /** All pages in subject — swipe 1/N on card (not due-only subset). */
          previews: getBundlesFrontPreviews(bundles),
        };
      })
      .filter((e) => e.totalPages > 0);
  }, [data.subjects, data.bundles, dueSelected]);

  useEffect(() => {
    setPreviewIndexBySubject((prev) => {
      const next: Record<string, number> = {};
      for (const entry of subjectEntries) {
        const max = Math.max(0, entry.previews.length - 1);
        const cur = prev[entry.subject.id] ?? 0;
        next[entry.subject.id] = Math.min(cur, max);
      }
      return next;
    });
  }, [subjectEntries]);

  useEffect(() => {
    const dueSubjectIds = subjectEntries
      .filter((e) => e.duePages > 0)
      .map((e) => e.subject.id);
    if (dueSubjectIds.length > 0) {
      setSelectedSubjectIds(new Set(dueSubjectIds));
      return;
    }
    if (subjectEntries.length > 0) {
      setSelectedSubjectIds(new Set(subjectEntries.map((e) => e.subject.id)));
    } else {
      setSelectedSubjectIds(new Set());
    }
  }, [selectedDate, subjectEntries]);

  const toggleSubject = useCallback((subjectId: string) => {
    setSelectedSubjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(subjectId)) next.delete(subjectId);
      else next.add(subjectId);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedSubjectIds(new Set(subjectEntries.map((e) => e.subject.id)));
  }, [subjectEntries]);

  const clearAll = useCallback(() => {
    setSelectedSubjectIds(new Set());
  }, []);

  const setPreviewIndex = useCallback((subjectId: string, index: number) => {
    setPreviewIndexBySubject((prev) => ({ ...prev, [subjectId]: index }));
  }, []);

  const canStart = selectedSubjectIds.size > 0;

  const openReview = () => {
    if (!canStart) return;
    const ids = Array.from(selectedSubjectIds);
    const pageCount = subjectEntries
      .filter((e) => ids.includes(e.subject.id))
      .reduce((n, e) => n + e.previews.length, 0);
    if (pageCount === 0) {
      showMessage('', t('dashboard.noReviewPages'));
      return;
    }
    router.push({
      pathname: '/review/session',
      params: {
        blackout: '1',
        subjectIds: ids.join(','),
        startPage: String(
          ids.length === 1
            ? Math.min(
                previewIndexBySubject[ids[0]] ?? 0,
                (subjectEntries.find((e) => e.subject.id === ids[0])?.previews.length ?? 1) - 1
              )
            : 0
        ),
      },
    });
  };

  return (
    <Screen scroll nestedScrollEnabled>
      <ScreenHeader title={t('dashboard.title')} showSettings />

      <View style={styles.calendarSection}>
        <DashboardCalendar
          marks={ribbonMarks}
          selectedDate={selectedDate}
          localToday={localToday}
          firstLaunchDate={data.settings.firstLaunchDate}
          onSelectDate={setSelectedDate}
        />
      </View>

      {subjectEntries.length === 0 ? (
        <View style={styles.emptyBlock}>
          <Text style={styles.empty}>{t('dashboard.noSubjects')}</Text>
          <Button
            label={t('dashboard.addPhotos')}
            onPress={() => router.push('/(tabs)/capture')}
            style={styles.emptyBtn}
          />
          <Button
            label={t('vault.addFolder')}
            variant="ghost"
            onPress={() => router.push('/(tabs)/vault')}
            style={styles.emptyGhostBtn}
          />
        </View>
      ) : (
        <>
          {dueSelected.length === 0 ? (
            <Text style={styles.emptySchedule}>
              {selectedDate === localToday
                ? t('dashboard.empty')
                : t('dashboard.emptyDate', { date: selectedDate })}
            </Text>
          ) : null}

          <DashboardReviewPicker
            entries={subjectEntries}
            selectedIds={selectedSubjectIds}
            previewIndexBySubject={previewIndexBySubject}
            onToggle={toggleSubject}
            onPreviewIndexChange={setPreviewIndex}
            onSelectAll={selectAll}
            onClearAll={clearAll}
          />
        </>
      )}

      {subjectEntries.length > 0 ? (
        <SpringPressable
          style={[styles.startBtn, !canStart && styles.startBtnDisabled]}
          onPress={openReview}
          disabled={!canStart}>
          <Text style={styles.startText}>{t('dashboard.startReview')}</Text>
        </SpringPressable>
      ) : null}

      {!canStart && subjectEntries.length > 0 ? (
        <Text style={styles.startHint}>{t('dashboard.startReviewHint')}</Text>
      ) : null}

    </Screen>
  );
}

const styles = StyleSheet.create({
  calendarSection: { marginBottom: 8 },
  emptyBlock: {
    marginVertical: 24,
    gap: 12,
    width: '100%',
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  empty: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.gray,
    textAlign: 'center',
    lineHeight: 22,
    width: '100%',
  },
  emptyBtn: { alignSelf: 'center', minWidth: 240, maxWidth: 280 },
  emptyGhostBtn: { alignSelf: 'center' },
  emptySchedule: {
    fontSize: theme.font.caption,
    fontWeight: '600',
    color: theme.grayMuted,
    marginBottom: 8,
    textAlign: 'center',
  },
  startBtn: {
    alignSelf: 'center',
    marginVertical: 20,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.orange,
  },
  startBtnDisabled: { opacity: 0.45 },
  startText: { color: theme.white, fontWeight: '800', fontSize: theme.font.body },
  startHint: {
    textAlign: 'center',
    fontSize: theme.font.caption,
    color: theme.gray,
    marginTop: -12,
    marginBottom: 16,
  },
});
