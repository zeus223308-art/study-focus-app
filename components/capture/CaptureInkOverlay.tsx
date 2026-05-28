import { Platform, StyleSheet, View } from 'react-native';
import Svg from 'react-native-svg';

import { InkStrokePath } from '@/components/annotation/InkStrokePath';
import { WebInkCanvasOverlay } from '@/components/annotation/WebInkCanvasOverlay';
import type { InkStroke } from '@/lib/domain/types';

type Rect = { left: number; top: number; width: number; height: number };

type Props = {
  strokes: InkStroke[];
  displayRect: Rect;
};

/** Read-only ink preview (crop mode, etc.). */
export function CaptureInkOverlay({ strokes, displayRect }: Props) {
  if (strokes.length === 0 || displayRect.width < 1 || displayRect.height < 1) {
    return null;
  }

  const overlayStyle = [
    styles.overlay,
    {
      left: displayRect.left,
      top: displayRect.top,
      width: displayRect.width,
      height: displayRect.height,
    },
  ];

  if (Platform.OS === 'web') {
    return (
      <View pointerEvents="none" style={overlayStyle}>
        <WebInkCanvasOverlay
          width={displayRect.width}
          height={displayRect.height}
          strokes={strokes.filter((s) => s.tool !== 'eraser' && s.points.length >= 2)}
          eraserPreview={null}
        />
      </View>
    );
  }

  return (
    <Svg pointerEvents="none" width={displayRect.width} height={displayRect.height} style={overlayStyle}>
      {strokes.map((stroke) => {
        if (stroke.points.length < 2 || stroke.tool === 'eraser') return null;
        return (
          <InkStrokePath
            key={stroke.id}
            id={stroke.id}
            tool={stroke.tool}
            points={stroke.points}
            width={stroke.width}
            opacity={stroke.opacity}
          />
        );
      })}
    </Svg>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    zIndex: 4,
  },
});
