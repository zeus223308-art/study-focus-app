import { Image, Platform, StyleSheet, View } from 'react-native';

import { PEN_SWATCH_DATA_URI } from '@/lib/domain/pen-swatch-images';
import type { PenToolId } from '@/lib/domain/types';
import { penSwatchStyle } from '@/lib/ui/pen-ink-swatch-style';

type Props = {
  tool: PenToolId;
  size: number;
};

/** Pen color chip — web black/white use 1×1 PNG fill so colors never invert. */
export function PenInkSwatch({ tool, size }: Props) {
  const half = size / 2;
  const frame = penSwatchStyle(tool);
  const dataUri = Platform.OS === 'web' ? PEN_SWATCH_DATA_URI[tool] : undefined;

  if (dataUri) {
    return (
      <View
        style={[
          styles.frame,
          {
            width: size,
            height: size,
            borderRadius: half,
            borderColor: frame.borderColor,
            borderWidth: frame.borderWidth,
          },
        ]}
        {...{ dataSet: { inkSwatch: tool } }}>
        <Image
          source={{ uri: dataUri }}
          style={{ width: size, height: size, borderRadius: half }}
          resizeMode="stretch"
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.frame,
        { width: size, height: size, borderRadius: half },
        frame,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  frame: {
    borderStyle: 'solid',
    overflow: 'hidden',
  },
});
