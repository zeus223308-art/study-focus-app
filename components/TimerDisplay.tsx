import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { SessionMode } from '@/lib/types';

const MODE_LABELS: Record<SessionMode, string> = {
  focus: '집중',
  shortBreak: '짧은 휴식',
  longBreak: '긴 휴식',
};

const MODE_COLORS: Record<SessionMode, string> = {
  focus: '#6366F1',
  shortBreak: '#22C55E',
  longBreak: '#0EA5E9',
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type Props = {
  mode: SessionMode;
  secondsLeft: number;
  totalSeconds: number;
  running: boolean;
};

export function TimerDisplay({ mode, secondsLeft, totalSeconds, running }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const progress = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0;
  const accent = MODE_COLORS[mode];

  return (
    <View style={styles.wrap}>
      <View style={[styles.ringOuter, { borderColor: colors.border }]}>
        <View
          style={[
            styles.ringProgress,
            {
              borderColor: accent,
              opacity: 0.15 + progress * 0.85,
              transform: [{ scale: 0.85 + progress * 0.15 }],
            },
          ]}
        />
        <Text style={[styles.mode, { color: accent }]}>{MODE_LABELS[mode]}</Text>
        <Text style={[styles.time, { color: colors.text }]}>{formatTime(secondsLeft)}</Text>
        <Text style={[styles.status, { color: colors.textSecondary }]}>
          {running ? '진행 중' : '일시정지'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginVertical: 24 },
  ringOuter: {
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringProgress: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 8,
  },
  mode: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  time: { fontSize: 52, fontWeight: '700', fontVariant: ['tabular-nums'] },
  status: { fontSize: 14, marginTop: 8 },
});
