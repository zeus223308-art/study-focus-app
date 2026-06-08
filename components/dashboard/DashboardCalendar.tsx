import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { enUS, ko } from 'date-fns/locale';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { CalendarTagDots } from '@/components/dashboard/CalendarTagDots';
import { theme } from '@/constants/theme';
import { useApp, useLanguage } from '@/context/AppContext';
import { formatStudyDateHeading } from '@/lib/ui/format-study-date';
import { useViewportLayout } from '@/lib/ui/viewport-layout';
import { buildReviewMarkForDate } from '@/lib/domain/ribbon';
import type { DateRibbonMark } from '@/lib/domain/types';

type Props = {
  marks: DateRibbonMark[];
  selectedDate: string;
  localToday: string;
  ribbonHorizon: string;
  firstLaunchDate: string;
  onSelectDate: (date: string) => void;
};

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

function formatMonthTitle(date: Date, language: 'ko' | 'en'): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  if (language === 'ko') return `${year}년 ${month}월`;
  return format(date, 'MMMM yyyy', { locale: enUS });
}

export function DashboardCalendar({
  marks,
  selectedDate,
  localToday,
  ribbonHorizon,
  firstLaunchDate,
  onSelectDate,
}: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { data, getSchedule } = useApp();
  const viewport = useViewportLayout();
  const compact = viewport.isPhone;
  const bundles = data?.bundles ?? [];

  const bounds = useMemo(
    () => ({ min: firstLaunchDate, max: ribbonHorizon }),
    [firstLaunchDate, ribbonHorizon]
  );

  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(parseISO(`${selectedDate}T12:00:00`))
  );

  useEffect(() => {
    const selectedMonth = startOfMonth(parseISO(`${selectedDate}T12:00:00`));
    setViewMonth((prev) => (isSameMonth(prev, selectedMonth) ? prev : selectedMonth));
  }, [selectedDate]);

  const monthStart = startOfMonth(viewMonth);
  const monthKey = format(monthStart, 'yyyy-MM');
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 0 });
  const days = useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    [monthKey]
  );

  const markMap = useMemo(() => {
    const map: Record<string, DateRibbonMark> = Object.fromEntries(
      marks.map((m) => [m.date, m])
    );
    for (const day of days) {
      const key = format(day, 'yyyy-MM-dd');
      if (!map[key]) {
        map[key] = buildReviewMarkForDate(
          day,
          bundles,
          getSchedule,
          localToday,
          data.settings.tagColors,
          data.settings.tagColor
        );
      }
    }
    return map;
  }, [monthKey, marks, days, bundles, getSchedule, localToday, data.settings.tagColors, data.settings.tagColor]);

  const todayDate = startOfDay(parseISO(`${localToday}T12:00:00`));
  const horizonDate = startOfDay(parseISO(`${ribbonHorizon}T12:00:00`));
  const minDate = startOfDay(parseISO(`${bounds.min}T12:00:00`));

  const canGoPrevMonth = monthStart > startOfMonth(minDate);
  const canGoNextMonth = monthStart < startOfMonth(horizonDate);

  const monthLabel = formatMonthTitle(viewMonth, language);
  const selectedMonth = startOfMonth(parseISO(`${selectedDate}T12:00:00`));
  const selectedInViewMonth = isSameMonth(selectedMonth, monthStart);
  const selectedDateHeading = useMemo(
    () =>
      formatStudyDateHeading(selectedDate, language, {
        today: t('dashboard.calendarJumpToday'),
        yesterday: t('folder.dateYesterday'),
      }),
    [language, selectedDate, t]
  );
  const selectedMark = markMap[selectedDate];
  const dueSummary =
    selectedMark && selectedMark.bundleCount > 0
      ? t('dashboard.calendarDueCount', { count: selectedMark.bundleCount })
      : t('dashboard.calendarNoDue');

  const jumpToSelectedMonth = () => {
    setViewMonth(selectedMonth);
  };

  const statusColor = (status: DateRibbonMark['status'] | undefined) => {
    switch (status) {
      case 'overdue':
        return theme.orange;
      case 'upcoming':
        return theme.graySecondary;
      case 'complete':
        return theme.grayMuted;
      default:
        return theme.grayLight;
    }
  };

  const goPrevMonth = () => {
    if (!canGoPrevMonth) return;
    setViewMonth((m) => subMonths(m, 1));
  };

  const goNextMonth = () => {
    if (!canGoNextMonth) return;
    setViewMonth((m) => addMonths(m, 1));
  };

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact, theme.cardShadow]}>
      <View style={styles.titleBlock}>
        <Text style={styles.title}>{t('dashboard.calendarTitle')}</Text>
        <View style={styles.selectedRow}>
          <View style={styles.selectedPill}>
            <Text style={styles.selectedPillText}>
              {t('dashboard.calendarSelected', { date: selectedDateHeading })}
            </Text>
          </View>
          {selectedDate !== localToday ? (
            <Pressable
              onPress={() => onSelectDate(localToday)}
              hitSlop={8}
              accessibilityLabel={t('dashboard.calendarJumpToday')}
              style={styles.todayBtn}>
              <Text style={styles.todayBtnText}>{t('dashboard.calendarJumpToday')}</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.dueSummary}>{dueSummary}</Text>
        {!selectedInViewMonth ? (
          <Pressable
            onPress={jumpToSelectedMonth}
            hitSlop={8}
            accessibilityLabel={t('dashboard.calendarShowSelected', {
              date: selectedDateHeading,
            })}
            style={styles.showSelectedBtn}>
            <Text style={styles.showSelectedText}>
              {t('dashboard.calendarShowSelected', { date: selectedDateHeading })}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.monthNav}>
        <Pressable
          onPress={goPrevMonth}
          disabled={!canGoPrevMonth}
          hitSlop={12}
          accessibilityLabel={t('dashboard.calendarPrevMonth')}
          style={[styles.navBtn, !canGoPrevMonth && styles.navDisabled]}>
          <SymbolView
            name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            size={22}
            tintColor={canGoPrevMonth ? theme.black : theme.grayLight}
          />
        </Pressable>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <Pressable
          onPress={goNextMonth}
          disabled={!canGoNextMonth}
          hitSlop={12}
          accessibilityLabel={t('dashboard.calendarNextMonth')}
          style={[styles.navBtn, !canGoNextMonth && styles.navDisabled]}>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'arrow_forward', web: 'arrow_forward' }}
            size={22}
            tintColor={canGoNextMonth ? theme.black : theme.grayLight}
          />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAY_KEYS.map((key) => (
          <Text key={key} style={styles.weekday}>
            {t(`dashboard.weekday.${key}`)}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const inMonth = isSameMonth(day, monthStart);
          const selectable = day >= minDate && day <= horizonDate;
          const isFuture = day > todayDate;
          const selected = key === selectedDate;
          const isToday = isSameDay(day, todayDate);
          const mark = markMap[key];
          const tagDots = mark?.tagDots ?? [];

          return (
            <Pressable
              key={key}
              disabled={!selectable}
              onPress={() => onSelectDate(key)}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: !selectable }}
              accessibilityLabel={key}
              style={[
                styles.cell,
                compact && styles.cellCompact,
                !inMonth && styles.cellDim,
                isFuture && inMonth && !selected && styles.cellFuture,
                !selectable && !isFuture && styles.cellDisabled,
              ]}>
              <View
                style={[
                  styles.cellInner,
                  selected && styles.cellSelected,
                  isToday && !selected && styles.cellToday,
                ]}>
                <Text
                  style={[
                    styles.dayNum,
                    selected && styles.dayNumSelected,
                    !selected && mark && mark.bundleCount > 0 && styles.dayDue,
                  ]}>
                  {format(day, 'd')}
                </Text>
                {mark && mark.bundleCount > 0 ? (
                  tagDots.length > 0 ? (
                    <CalendarTagDots colors={tagDots} size={5} gap={2} max={4} />
                  ) : (
                    <View
                      style={[
                        styles.dot,
                        selected && styles.dotSelected,
                        {
                          backgroundColor: selected
                            ? theme.onAccent
                            : statusColor(mark.status),
                        },
                      ]}
                    />
                  )
                ) : (
                  <View style={styles.dotPlaceholder} />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.grayLight,
    marginBottom: 12,
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  wrapCompact: {
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  titleBlock: { gap: 6, marginBottom: 10 },
  title: { fontSize: theme.font.body, fontWeight: '800', color: theme.black },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedPill: {
    backgroundColor: theme.orange,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.orange,
  },
  selectedPillText: {
    fontSize: theme.font.caption,
    fontWeight: '800',
    color: theme.onAccent,
  },
  todayBtn: {
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.grayLight,
    justifyContent: 'center',
  },
  todayBtnText: {
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.gray,
  },
  showSelectedBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  showSelectedText: {
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.orange,
    textDecorationLine: 'underline',
  },
  dueSummary: { fontSize: theme.font.caption, fontWeight: '700', color: theme.graySecondary },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: theme.beige,
    borderRadius: theme.radius.sm,
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: theme.font.heading,
    fontWeight: '800',
    color: theme.black,
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navDisabled: { opacity: 0.35 },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekday: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: theme.grayMuted,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, padding: 2 },
  cellCompact: { padding: 1 },
  cellDim: { opacity: 0.35 },
  cellFuture: { opacity: 0.72 },
  cellDisabled: { opacity: 0.25 },
  cellInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  cellSelected: { backgroundColor: theme.orange },
  cellToday: { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.orange },
  dayNum: { fontSize: theme.font.caption, fontWeight: '600', color: theme.black },
  dayNumSelected: { color: theme.onAccent, fontWeight: '800' },
  dayDue: { fontWeight: '800' },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  dotSelected: { borderWidth: 1, borderColor: theme.grayLight },
  dotPlaceholder: { width: 5, height: 5, marginTop: 2 },
});
