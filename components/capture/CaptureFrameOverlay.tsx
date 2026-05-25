import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { theme } from '@/constants/theme';
import {
  computeFrameRect,
  type CaptureFrameAspect,
} from '@/lib/files/capture-frame';

type Props = {
  aspect: CaptureFrameAspect;
};

export function CaptureFrameOverlay({ aspect }: Props) {
  const [layout, setLayout] = useState({ w: 0, h: 0 });
  const frame =
    layout.w > 0 && layout.h > 0
      ? computeFrameRect(layout.w, layout.h, aspect)
      : null;

  return (
    <View
      style={styles.root}
      pointerEvents="none"
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width !== layout.w || height !== layout.h) {
          setLayout({ w: width, h: height });
        }
      }}>
      {frame && aspect !== 'full' ? (
        <>
          <View style={[styles.dim, { top: 0, left: 0, right: 0, height: frame.top }]} />
          <View
            style={[
              styles.dim,
              { top: frame.top + frame.height, left: 0, right: 0, bottom: 0 },
            ]}
          />
          <View
            style={[
              styles.dim,
              {
                top: frame.top,
                left: 0,
                width: frame.left,
                height: frame.height,
              },
            ]}
          />
          <View
            style={[
              styles.dim,
              {
                top: frame.top,
                left: frame.left + frame.width,
                right: 0,
                height: frame.height,
              },
            ]}
          />
          <View
            style={[
              styles.frame,
              {
                left: frame.left,
                top: frame.top,
                width: frame.width,
                height: frame.height,
              },
            ]}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, zIndex: 1 },
  dim: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.42)' },
  frame: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: theme.orange,
    borderRadius: 4,
  },
});
