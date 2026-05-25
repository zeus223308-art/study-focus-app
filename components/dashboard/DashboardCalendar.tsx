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

import { theme } from '@/constants/theme';
import { useLanguage } from '@/context/AppContext';
import type { DateRibbonMark } from '@/lib/domain/types';

type Props = {
  marks: DateRibbonMark[];
  selectedDate: string;
  localToday: string;
  firstLaunchDate: string;
  onSelectDate: (date: string) => void;
};

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

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

  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(parseISO(`${selectedDate}T12:00:00`))
  );

  useEffect(() => {
    setViewMonth(startOfMonth(parseISO(`${selectedDate}T12:00:00`)));
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
  const minDate = startOfDay(parseISO(`${firstLaunchDate}T12:00:00`));

  const canGoPrev = monthStart > startOfMonth(minDate);
  const canGoNext = monthStart < startOfMonth(todayDate);

  const monthLabel = format(viewMonth, 'yyyy MMMM', { locale });

  const statusColor = (status: DateRibbonMark['status'] | undefined) => {
    switch (status) {
      case 'overdue':
        return theme.orange;
      case 'upcoming':
        return theme.graySecondary;
      case 'complete':
        return theme.grayMuted;
      default:
        return 'transparent';
    }
  };

  return (
    <View style={[styles.wrap, theme.cardShadow]}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{t('dashboard.calendarTitle')}</Text>
          <Text style={styles.sub}>{t('dashboard.calendarSub')}</Text>
        </View>
        <View style={styles.nav}>
          <Pressable
            onPress={() => canGoPrev && setViewMonth((m) => subMonths(m, 1))}
            disabled={!canGoPrev}
            hitSlop={10}
            style={!canGoPrev && styles.navDisabled}>
            <SymbolView
              name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
              size={18}
              tintColor={canGoPrev ? theme.black : theme.grayLight}
            />
          </Pressable>
          <Text style={styles.month}>{monthLabel}</Text>
          <Pressable
            onPress={() => canGoNext && setViewMonth((m) => addMonths(m, 1))}
            disabled={!canGoNext}
            hitSlop={10}
            style={!canGoNext && styles.navDisabled}>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'arrow_forward', web: 'arrow_forward' }}
              size={18}
              tintColor={canGoNext ? theme.black : theme.grayLight}
            />
          </Pressable>
        </View>
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
                    mark && mark.bundleCount > 0 && styles.dayDue,
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
  header: { marginBottom: 10, gap: 10 },
  titleBlock: { gap: 4 },
  title: { fontSize: theme.font.body, fontWeight: '800', color: theme.black },
  sub: { fontSize: theme.font.caption, fontWeight: '600', color: theme.grayMuted, lineHeight: 18 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navDisabled: { opacity: 0.35 },
  month: { fontSize: theme.font.heading, fontWeight: '800', color: theme.black },
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
});
