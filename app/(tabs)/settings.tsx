import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useStudy } from '@/context/StudyContext';
import type { AppSettings } from '@/lib/types';

type SettingKey = keyof Pick<
  AppSettings,
  | 'focusMinutes'
  | 'shortBreakMinutes'
  | 'longBreakMinutes'
  | 'sessionsUntilLongBreak'
  | 'dailyGoalMinutes'
>;

const SETTING_ROWS: { key: SettingKey; label: string; step: number; min: number; max: number; unit: string }[] = [
  { key: 'focusMinutes', label: '집중 시간', step: 5, min: 5, max: 90, unit: '분' },
  { key: 'shortBreakMinutes', label: '짧은 휴식', step: 1, min: 1, max: 30, unit: '분' },
  { key: 'longBreakMinutes', label: '긴 휴식', step: 5, min: 5, max: 45, unit: '분' },
  { key: 'sessionsUntilLongBreak', label: '긴 휴식 주기', step: 1, min: 2, max: 8, unit: '회' },
  { key: 'dailyGoalMinutes', label: '일일 목표', step: 15, min: 30, max: 480, unit: '분' },
];

export default function SettingsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { data, updateSettings } = useStudy();
  const { settings } = data;

  const adjust = (key: SettingKey, delta: number, min: number, max: number) => {
    const next = Math.min(max, Math.max(min, settings[key] + delta));
    updateSettings({ [key]: next });
  };

  return (
    <Screen scroll>
      <Text style={[styles.title, { color: colors.text }]}>설정</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        나에게 맞는 포모도로 루틴을 설정하세요
      </Text>

      <Card>
        {SETTING_ROWS.map((row, index) => (
          <View
            key={row.key}
            style={[
              styles.row,
              index < SETTING_ROWS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
            ]}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>{row.label}</Text>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => adjust(row.key, -row.step, row.min, row.max)}
                style={[styles.stepBtn, { borderColor: colors.border }]}>
                <Text style={{ color: colors.text, fontSize: 20 }}>−</Text>
              </Pressable>
              <Text style={[styles.value, { color: colors.tint }]}>
                {settings[row.key]}
                {row.unit}
              </Text>
              <Pressable
                onPress={() => adjust(row.key, row.step, row.min, row.max)}
                style={[styles.stepBtn, { borderColor: colors.border }]}>
                <Text style={{ color: colors.text, fontSize: 20 }}>+</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Text style={[styles.aboutTitle, { color: colors.text }]}>스터디 포커스</Text>
        <Text style={[styles.aboutText, { color: colors.textSecondary }]}>
          포모도로 타이머와 과목별 공부 기록을 한곳에서 관리하는 공부 앱입니다.
        </Text>
        <Text style={[styles.version, { color: colors.textSecondary }]}>버전 1.0.0</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', marginTop: 8 },
  subtitle: { fontSize: 15, marginTop: 4, marginBottom: 20 },
  row: { paddingVertical: 14 },
  rowLabel: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { fontSize: 20, fontWeight: '700', minWidth: 80, textAlign: 'center' },
  aboutTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  aboutText: { fontSize: 14, lineHeight: 22 },
  version: { fontSize: 12, marginTop: 12 },
});
