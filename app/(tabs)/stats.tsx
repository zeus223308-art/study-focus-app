import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useStudy } from '@/context/StudyContext';
import { getFocusMinutesBySubjectToday, getLast7DaysFocus } from '@/lib/stats';

export default function StatsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { data, todayMinutes } = useStudy();
  const week = getLast7DaysFocus(data.sessions);
  const bySubject = getFocusMinutesBySubjectToday(data.sessions);
  const maxWeek = Math.max(...week.map((d) => d.minutes), 1);

  return (
    <Screen scroll>
      <Text style={[styles.title, { color: colors.text }]}>통계</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        공부 기록을 한눈에 확인하세요
      </Text>

      <View style={styles.grid}>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.tint }]}>{todayMinutes}분</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>오늘 집중</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.success }]}>{data.streak}일</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>연속 학습</Text>
        </Card>
      </View>

      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>최근 7일</Text>
        <View style={styles.chart}>
          {week.map((day) => (
            <View key={day.label} style={styles.barCol}>
              <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${(day.minutes / maxWeek) * 100}%`,
                      backgroundColor: colors.tint,
                      minHeight: day.minutes > 0 ? 4 : 0,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.barLabel, { color: colors.textSecondary }]}>{day.label}</Text>
              <Text style={[styles.barMin, { color: colors.text }]}>{day.minutes}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>오늘 과목별</Text>
        {data.subjects.map((subject) => {
          const minutes = bySubject[subject.id] ?? 0;
          return (
            <View key={subject.id} style={styles.subjectRow}>
              <View style={[styles.dot, { backgroundColor: subject.color }]} />
              <Text style={[styles.subjectName, { color: colors.text }]}>{subject.name}</Text>
              <Text style={[styles.subjectMin, { color: colors.textSecondary }]}>{minutes}분</Text>
            </View>
          );
        })}
        {Object.keys(bySubject).length === 0 && (
          <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
            아직 오늘 기록이 없어요. 타이머를 시작해 보세요!
          </Text>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', marginTop: 8 },
  subtitle: { fontSize: 15, marginTop: 4, marginBottom: 20 },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 32, fontWeight: '800' },
  statLabel: { fontSize: 14, marginTop: 4 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 16 },
  chart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 140 },
  barCol: { flex: 1, alignItems: 'center' },
  barTrack: { width: 28, height: 100, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 6 },
  barLabel: { fontSize: 11, marginTop: 6 },
  barMin: { fontSize: 12, fontWeight: '600' },
  subjectRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  subjectName: { flex: 1, fontSize: 16, fontWeight: '600' },
  subjectMin: { fontSize: 15 },
});
