import { Platform } from 'react-native';
import { Path } from 'react-native-svg';

import type { InkPoint, InkToolId } from '@/lib/domain/types';
import { displayStrokeColor } from '@/lib/domain/ink-stroke-style';

type Props = {
  id: string;
  tool: InkToolId;
  points: InkPoint[];
  width: number;
  opacity: number;
};

function pointsToPath(points: InkPoint[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  return `M ${first.x} ${first.y} ${rest.map((p) => `L ${p.x} ${p.y}`).join(' ')}`;
}

/** SVG stroke path — color always derived from tool id (not theme tokens). */
export function InkStrokePath({ id, tool, points, width, opacity }: Props) {
  const stroke = displayStrokeColor(tool);
  return (
    <Path
      key={id}
      d={pointsToPath(points)}
      stroke={stroke}
      strokeWidth={width}
      strokeOpacity={opacity}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...(Platform.OS === 'web'
        ? {
            dataSet: { inkStroke: tool },
            style: { forcedColorAdjust: 'none', colorScheme: 'light' } as const,
          }
        : {})}
    />
  );
}
