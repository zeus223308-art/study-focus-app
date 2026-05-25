import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { styleForStroke } from '@/lib/domain/ink-stroke-style';
import type { InkPoint, InkStroke } from '@/lib/domain/types';

function pointsToPath(points: InkPoint[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  return `M ${first.x} ${first.y} ${rest.map((p) => `L ${p.x} ${p.y}`).join(' ')}`;
}

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

  return (
    <Svg
      pointerEvents="none"
      width={displayRect.width}
      height={displayRect.height}
      style={[
        styles.overlay,
        {
          left: displayRect.left,
          top: displayRect.top,
          width: displayRect.width,
          height: displayRect.height,
        },
      ]}>
      {strokes.map((stroke) => {
        const spec = styleForStroke(stroke);
        if (stroke.points.length < 2) return null;
        return (
          <Path
            key={stroke.id}
            d={pointsToPath(stroke.points)}
            stroke={spec.color}
            strokeWidth={stroke.width}
            strokeOpacity={stroke.opacity}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
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
