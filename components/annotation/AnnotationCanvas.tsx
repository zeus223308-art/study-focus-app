import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { theme } from '@/constants/theme';
import { HIGHLIGHTER_TOOLS, PEN_TOOLS } from '@/lib/domain/defaults';
import type { InkPoint, InkStroke, InkToolId, NoteLayer } from '@/lib/domain/types';

const TOOL_COLORS: Record<InkToolId, { color: string; width: number; opacity: number }> = {
  'pen-black': { color: '#0D0D0D', width: 2, opacity: 1 },
  'pen-red': { color: '#DC2626', width: 2, opacity: 1 },
  'pen-blue': { color: '#2563EB', width: 2, opacity: 1 },
  'hi-yellow': { color: 'rgba(255, 230, 0, 0.45)', width: 12, opacity: 0.45 },
  'hi-green': { color: 'rgba(74, 222, 128, 0.4)', width: 12, opacity: 0.4 },
  'hi-pink': { color: 'rgba(244, 114, 182, 0.4)', width: 12, opacity: 0.4 },
  eraser: { color: theme.beige, width: 24, opacity: 1 },
};

for (const p of PEN_TOOLS) {
  TOOL_COLORS[p.id].color = p.color;
  TOOL_COLORS[p.id].width = p.width;
}
for (const h of HIGHLIGHTER_TOOLS) {
  TOOL_COLORS[h.id].color = h.color;
  TOOL_COLORS[h.id].width = h.width;
}

function pointsToPath(points: InkPoint[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  return `M ${first.x} ${first.y} ${rest.map((p) => `L ${p.x} ${p.y}`).join(' ')}`;
}

type Props = {
  layer: NoteLayer;
  tool: InkToolId;
  visible: boolean;
  onStrokesChange: (strokes: InkStroke[]) => void;
  height?: number;
};

export function AnnotationCanvas({ layer, tool, visible, onStrokesChange, height = 280 }: Props) {
  const [size, setSize] = useState({ w: 320, h: height });
  const strokesRef = useRef<InkStroke[]>(layer.strokes);
  const currentRef = useRef<InkStroke | null>(null);
  const [, bump] = useState(0);

  useEffect(() => {
    strokesRef.current = layer.strokes;
    bump((n) => n + 1);
  }, [layer.id, layer.strokes]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height: h } = e.nativeEvent.layout;
    setSize({ w: width, h });
  };

  const commitStroke = useCallback(() => {
    const cur = currentRef.current;
    if (!cur || cur.points.length < 2) {
      currentRef.current = null;
      return;
    }
    const next = tool === 'eraser'
      ? strokesRef.current.filter((s) => !strokeIntersects(cur, s))
      : [...strokesRef.current, cur];
    strokesRef.current = next;
    currentRef.current = null;
    onStrokesChange(next);
    bump((n) => n + 1);
  }, [onStrokesChange, tool]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => visible,
      onMoveShouldSetPanResponder: () => visible,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX: x, locationY: y } = evt.nativeEvent;
        const spec = TOOL_COLORS[tool];
        currentRef.current = {
          id: `stroke_${Date.now()}`,
          tool,
          points: [{ x, y }],
          width: spec.width,
          opacity: spec.opacity,
          createdAt: new Date().toISOString(),
        };
        bump((n) => n + 1);
      },
      onPanResponderMove: (evt) => {
        const cur = currentRef.current;
        if (!cur) return;
        const { locationX: x, locationY: y } = evt.nativeEvent;
        cur.points.push({ x, y });
        bump((n) => n + 1);
      },
      onPanResponderRelease: commitStroke,
      onPanResponderTerminate: commitStroke,
    })
  ).current;

  if (!visible) return null;

  const display = [...strokesRef.current, ...(currentRef.current ? [currentRef.current] : [])];

  return (
    <View style={[styles.wrap, { height }]} onLayout={onLayout} {...pan.panHandlers}>
      <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill}>
        {display.map((s) => {
          const spec = TOOL_COLORS[s.tool];
          return (
            <Path
              key={s.id}
              d={pointsToPath(s.points)}
              stroke={spec.color}
              strokeWidth={s.width}
              strokeOpacity={s.opacity}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </Svg>
    </View>
  );
}

function strokeIntersects(eraser: InkStroke, stroke: InkStroke): boolean {
  const pad = eraser.width;
  for (const p of eraser.points) {
    for (const q of stroke.points) {
      if (Math.hypot(p.x - q.x, p.y - q.y) < pad) return true;
    }
  }
  return false;
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'transparent',
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
  },
});
