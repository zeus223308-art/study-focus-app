import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';

import type { PenToolId } from '@/lib/domain/types';
import { penSwatchStyle } from '@/lib/ui/pen-ink-swatch-style';

type Props = {
  tool: PenToolId;
  size: number;
};

const webInkFix: ViewStyle =
  Platform.OS === 'web'
    ? ({
        forcedColorAdjust: 'none',
        colorScheme: 'light',
      } as ViewStyle)
    : {};

/** Pen color chip — fixed fill per tool id (avoids black↔white inversion on mobile web). */
export function PenInkSwatch({ tool, size }: Props) {
  const half = size / 2;
  return (
    <View
      style={[
        styles.base,
        { width: size, height: size, borderRadius: half },
        penSwatchStyle(tool),
        webInkFix,
      ]}
      {...(Platform.OS === 'web' ? { dataSet: { inkSwatch: tool } } : {})}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderStyle: 'solid',
  },
});
