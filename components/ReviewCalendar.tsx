import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { getNextReviewDate } from '@/lib/review';
import type { Folder, ReviewSchedule, StudyItem } from '@/lib/types';

type Props = {
  items: StudyItem[];
  folders: Folder[];
  getSchedule: (id: string) => ReviewSchedule | undefined;
  month?: Date;
};

export function ReviewCalendar({ items, folders, getSchedule, month = new Date() }: Props) {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const days = eachDayOfInterval({ start, end });

  const marks: Record<string, { folderId: string; color: string }[]> = {};
  for (const item of items) {
    if (item.archived) continue;
    const schedule = getSchedule(item.reviewScheduleId);
    if (!schedule) continue;
    const next = format(getNextReviewDate(item, schedule), 'yyyy-MM-dd');
    const folder = folders.find((f) => f.id === item.folderId);
    if (!folder) continue;
    if (!marks[next]) marks[next] = [];
    if (!marks[next].some((m) => m.folderId === folder.id)) {
      marks[next].push({ folderId: folder.id, color: folder.color });
    }
  }

  return (
    <View style={[styles.wrap, theme.cardShadow]}>
      <Text style={styles.calendarLabel}>Calendar</Text>
      <Text style={styles.month}>{format(month, 'MMMM')}</Text>
      <View style={styles.grid}>
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dots = marks[key] ?? [];
          const inMonth = isSameMonth(day, month);
          return (
            <View key={key} style={[styles.cell, !inMonth && styles.cellDim]}>
              <Text style={[styles.dayNum, dots.length > 0 && styles.dayDue]}>{format(day, 'd')}</Text>
              {dots.length > 0 && (
                <View style={styles.dots}>
                  {dots.slice(0, 4).map((d) => (
                    <View key={d.folderId} style={[styles.dot, { backgroundColor: d.color }]} />
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.grayLight,
  },
  calendarLabel: { fontSize: 13, fontWeight: '600', color: theme.gray, marginBottom: 4 },
  month: { fontSize: 18, fontWeight: '700', color: theme.black, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  cellDim: { opacity: 0.3 },
  dayNum: { fontSize: 12, color: theme.black },
  dayDue: { fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 3, marginTop: 3 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
});
