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

  const marks: Record<string, string[]> = {};
  for (const item of items) {
    if (item.archived) continue;
    const schedule = getSchedule(item.reviewScheduleId);
    if (!schedule) continue;
    const next = format(getNextReviewDate(item, schedule), 'yyyy-MM-dd');
    const folder = folders.find((f) => f.id === item.folderId);
    if (!marks[next]) marks[next] = [];
    if (folder) marks[next].push(folder.name);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.month}>{format(month, 'yyyy.MM')}</Text>
      <View style={styles.grid}>
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const subjects = marks[key] ?? [];
          const inMonth = isSameMonth(day, month);
          return (
            <View key={key} style={[styles.cell, !inMonth && styles.cellDim]}>
              <Text style={styles.dayNum}>{format(day, 'd')}</Text>
              {subjects.length > 0 && (
                <View style={styles.dots}>
                  {subjects.slice(0, 3).map((_, i) => (
                    <View
                      key={i}
                      style={[styles.dot, i === 0 ? styles.dotAccent : styles.dotDark]}
                    />
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
  wrap: { marginVertical: 12 },
  month: { fontSize: 15, fontWeight: '600', color: theme.black, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  cellDim: { opacity: 0.35 },
  dayNum: { fontSize: 11, color: theme.black },
  dots: { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  dotAccent: { backgroundColor: theme.accent },
  dotDark: { backgroundColor: theme.black },
});
