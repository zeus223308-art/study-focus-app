import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { theme } from '@/constants/theme';
import {
  CAPTURE_FRAME_ASPECTS,
  type CaptureFrameAspect,
} from '@/lib/files/capture-frame';

type Props = {
  value: CaptureFrameAspect;
  onChange: (aspect: CaptureFrameAspect) => void;
  /** Dark chips on camera overlay; light on beige sheets */
  variant?: 'dark' | 'light';
};

export function CaptureFramePicker({ value, onChange, variant = 'dark' }: Props) {
  const { t } = useTranslation();
  const light = variant === 'light';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}>
      {CAPTURE_FRAME_ASPECTS.map((aspect) => {
        const on = value === aspect;
        return (
          <Pressable
            key={aspect}
            onPress={() => onChange(aspect)}
            style={[styles.chip, light ? styles.chipLight : styles.chipDark, on && styles.chipOn]}>
            <Text style={[styles.chipText, on && styles.chipTextOn, light && !on && styles.chipTextLight]}>
              {t(`capture.frame.${aspect}`)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 44 },
  row: { gap: 8, paddingHorizontal: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
  },
  chipDark: {
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  chipLight: {
    borderColor: theme.grayLight,
    backgroundColor: theme.surface,
  },
  chipOn: { backgroundColor: theme.orange, borderColor: theme.orange },
  chipText: { fontSize: theme.font.caption, fontWeight: '700', color: theme.white },
  chipTextLight: { color: theme.black },
  chipTextOn: { color: theme.white },
});
