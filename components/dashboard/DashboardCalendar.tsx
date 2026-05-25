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

import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import { useLanguage } from '@/context/AppContext';
import { shiftStudyDateKey, studyDateBounds } from '@/lib/domain/dates';
import type { DateRibbonMark } from '@/lib/domain/types';

type Props = {
  marks: DateRibbonMark[];
  selectedDate: string;
  localToday: string;
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

function formatSelectedDayTitle(dateKey: string, language: 'ko' | 'en'): string {
  const d = parseISO(`${dateKey}T12:00:00`);
  if (language === 'ko') {
    return format(d, 'yyyy년 M월 d일 (EEE)', { locale: ko });
  }
  return format(d, 'EEE, MMM d, yyyy', { locale: enUS });
}

export function DashboardCalendar({
  marks,
  selectedDate,
  localToday,
  firstLaunchDate,
  onSelectDate,
}: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const locale = language === 'ko' ? ko : enUS;

  const bounds = useMemo(
    () => studyDateBounds(firstLaunchDate),
    [firstLaunchDate, localToday]
  );

  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(parseISO(`${selectedDate}T12:00:00`))
  );

  useEffect(() => {
    const selectedMonth = startOfMonth(parseISO(`${selectedDate}T12:00:00`));
    setViewMonth((prev) => (isSameMonth(prev, selectedMonth) ? prev : selectedMonth));
  }, [selectedDate]);

  const markMap = useMemo(
    () => Object.fromEntries(marks.map((m) => [m.date, m])),
    [marks]
  );

  const monthStart = startOfMonth(viewMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const todayDate = startOfDay(parseISO(`${localToday}T12:00:00`));
  const minDate = startOfDay(parseISO(`${bounds.min}T12:00:00`));

  const canGoPrevMonth = monthStart > startOfMonth(minDate);
  const canGoNextMonth = monthStart < startOfMonth(todayDate);

  const canGoPrevDay = selectedDate > bounds.min;
  const canGoNextDay = selectedDate < bounds.max;
  const isTodaySelected = selectedDate === localToday;

  const monthLabel = formatMonthTitle(viewMonth, language);
  const selectedMark = markMap[selectedDate];

  const statusLabel = (status: DateRibbonMark['status'] | undefined) => {
    switch (status) {
      case 'overdue':
        return t('dashboard.statusOverdue');
      case 'upcoming':
        return t('dashboard.statusDue');
      case 'complete':
        return t('dashboard.statusDone');
      default:
        return t('dashboard.statusNone');
    }
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

  const shiftDay = (delta: number) => {
    onSelectDate(shiftStudyDateKey(selectedDate, delta, bounds));
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
    <View style={[styles.wrap, theme.cardShadow]}>
      <View style={styles.titleBlock}>
        <Text style={styles.title}>{t('dashboard.calendarTitle')}</Text>
        <Text style={styles.sub}>{t('dashboard.calendarSub')}</Text>
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
          const selectable = day >= minDate && day <= todayDate;
          const selected = key === selectedDate;
          const isToday = isSameDay(day, todayDate);
          const mark = markMap[key];
          const dotColor = statusColor(mark?.status);

          return (
            <Pressable
              key={key}
              disabled={!selectable}
              onPress={() => onSelectDate(key)}
              style={[styles.cell, !inMonth && styles.cellDim, !selectable && styles.cellDisabled]}>
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
                  <View style={[styles.dot, { backgroundColor: dotColor }]} />
                ) : (
                  <View style={styles.dotPlaceholder} />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.dayPanel}>
        <View style={styles.dayNav}>
          <Pressable
            onPress={() => shiftDay(-1)}
            disabled={!canGoPrevDay}
            hitSlop={10}
            accessibilityLabel={t('dashboard.calendarPrevDay')}
            style={[styles.navBtn, !canGoPrevDay && styles.navDisabled]}>
            <SymbolView
              name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
              size={20}
              tintColor={canGoPrevDay ? theme.orange : theme.grayLight}
            />
          </Pressable>
          <View style={styles.dayMeta}>
            <Text style={styles.dayTitle}>{formatSelectedDayTitle(selectedDate, language)}</Text>
            <View style={styles.dayStatusRow}>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: statusColor(selectedMark?.status) },
                ]}
              />
              <Text style={styles.dayStatus}>{statusLabel(selectedMark?.status)}</Text>
              <Text style={styles.dayCount}>
                {selectedMark && selectedMark.bundleCount > 0
                  ? t('dashboard.calendarDueCount', { count: selectedMark.bundleCount })
                  : t('dashboard.calendarNoDue')}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => shiftDay(1)}
            disabled={!canGoNextDay}
            hitSlop={10}
            accessibilityLabel={t('dashboard.calendarNextDay')}
            style={[styles.navBtn, !canGoNextDay && styles.navDisabled]}>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'arrow_forward', web: 'arrow_forward' }}
              size={20}
              tintColor={canGoNextDay ? theme.orange : theme.grayLight}
            />
          </Pressable>
        </View>
        {!isTodaySelected ? (
          <Button
            label={t('dashboard.calendarJumpToday')}
            variant="ghost"
            onPress={() => onSelectDate(localToday)}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.grayLight,
    marginBottom: 12,
  },
  titleBlock: { gap: 4, marginBottom: 12 },
  title: { fontSize: theme.font.body, fontWeight: '800', color: theme.black },
  sub: { fontSize: theme.font.caption, fontWeight: '600', color: theme.grayMuted, lineHeight: 18 },
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
  cellDim: { opacity: 0.35 },
  cellDisabled: { opacity: 0.25 },
  cellInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  cellSelected: { backgroundColor: theme.orange },
  cellToday: { borderWidth: 1, borderColor: theme.orange },
  dayNum: { fontSize: theme.font.caption, fontWeight: '600', color: theme.black },
  dayNumSelected: { color: theme.white, fontWeight: '800' },
  dayDue: { fontWeight: '800' },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  dotPlaceholder: { width: 5, height: 5, marginTop: 2 },
  dayPanel: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.grayLight,
    gap: 8,
  },
  dayNav: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dayMeta: { flex: 1, alignItems: 'center', gap: 6 },
  dayTitle: { fontSize: theme.font.body, fontWeight: '800', color: theme.black, textAlign: 'center' },
  dayStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  statusPill: { width: 8, height: 8, borderRadius: 4 },
  dayStatus: { fontSize: theme.font.caption, fontWeight: '700', color: theme.gray },
  dayCount: { fontSize: theme.font.caption, fontWeight: '600', color: theme.graySecondary },
});
