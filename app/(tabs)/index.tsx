import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { SubjectPicker } from '@/components/SubjectPicker';
import { TimerDisplay } from '@/components/TimerDisplay';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useStudy } from '@/context/StudyContext';
import { usePomodoro } from '@/hooks/usePomodoro';
import type { SessionMode } from '@/lib/types';

const MODES: { key: SessionMode; label: string }[] = [
  { key: 'focus', label: '집중' },
  { key: 'shortBreak', label: '휴식' },
  { key: 'longBreak', label: '긴 휴식' },
];

export default function TimerScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { data, todayMinutes } = useStudy();
  const { mode, secondsLeft, totalSeconds, running, focusCount, toggle, skip, switchMode } =
    usePomodoro();
  const goal = data.settings.dailyGoalMinutes;
  const progress = Math.min(todayMinutes / goal, 1);

  return (
    <Screen>
      <Text style={[styles.title, { color: colors.text }]}>스터디 포커스</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        오늘 {todayMinutes}분 / 목표 {goal}분
      </Text>
      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View
          style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.tint }]}
        />
      </View>

      <Card style={styles.subjectCard}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>과목 선택</Text>
        <SubjectPicker />
      </Card>

      <TimerDisplay
        mode={mode}
        secondsLeft={secondsLeft}
        totalSeconds={totalSeconds}
        running={running}
      />

      <View style={styles.modeRow}>
        {MODES.map((m) => (
          <Pressable
            key={m.key}
            onPress={() => {
              Haptics.selectionAsync();
              switchMode(m.key);
            }}
            style={[
              styles.modeBtn,
              {
                backgroundColor: mode === m.key ? colors.tint : colors.card,
                borderColor: colors.border,
              },
            ]}>
            <Text style={{ color: mode === m.key ? '#fff' : colors.text, fontWeight: '600' }}>
              {m.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.controls}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            skip();
          }}
          style={[styles.secondaryBtn, { borderColor: colors.border }]}>
          <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>건너뛰기</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            toggle();
          }}
          style={[styles.primaryBtn, { backgroundColor: colors.tint }]}>
          <Text style={styles.primaryBtnText}>{running ? '일시정지' : '시작'}</Text>
        </Pressable>
      </View>

      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        완료한 집중 {focusCount}회 · {data.settings.sessionsUntilLongBreak}회마다 긴 휴식
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', marginTop: 8 },
  subtitle: { fontSize: 15, marginTop: 4, marginBottom: 12 },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 16 },
  progressFill: { height: '100%', borderRadius: 4 },
  subjectCard: { marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  modeRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 20 },
  modeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  controls: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  primaryBtn: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  hint: { textAlign: 'center', marginTop: 16, fontSize: 13 },
});
