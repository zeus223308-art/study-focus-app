import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { theme } from '@/constants/theme';
import { HIGHLIGHTER_TOOLS, PEN_TOOLS } from '@/lib/domain/defaults';
import type { InkPoint, InkStroke, InkToolId, NoteLayer } from '@/lib/domain/types';

const TOOL_COLORS: Record<InkToolId, { color: string; width: number; opacity: number }> = {
  'pen-black': { color: '#0D0D0D', width: 2, opacity: 1 },
  'pen-red': { color: '#DC2626', width: 2, opacity: 1 },
  'pen-blue': { color: '#2563EB', width: 2, opacity: 1 },
  'hi-yellow': { color: '#FFE600', width: 12, opacity: 0.45 },
  'hi-green': { color: '#4ADE80', width: 12, opacity: 0.4 },
  'hi-pink': { color: '#F472B6', width: 12, opacity: 0.4 },
  eraser: { color: theme.grayLight, width: 24, opacity: 0.35 },
};

for (const p of PEN_TOOLS) {
  TOOL_COLORS[p.id].color = p.color;
  TOOL_COLORS[p.id].width = p.width;
}
for (const h of HIGHLIGHTER_TOOLS) {
  TOOL_COLORS[h.id].color = h.color;
  TOOL_COLORS[h.id].width = h.width;
  TOOL_COLORS[h.id].opacity = h.opacity ?? TOOL_COLORS[h.id].opacity;
}

function pointsToPath(points: InkPoint[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  return `M ${first.x} ${first.y} ${rest.map((p) => `L ${p.x} ${p.y}`).join(' ')}`;
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

type Props = {
  layer: NoteLayer;
  tool: InkToolId;
  strokeWidth: number;
  visible: boolean;
  onStrokesChange: (strokes: InkStroke[]) => void;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

export function AnnotationCanvas({
  layer,
  tool,
  strokeWidth,
  visible,
  onStrokesChange,
  height = 280,
  style,
}: Props) {
  const [size, setSize] = useState({ w: 320, h: height });
  const strokesRef = useRef<InkStroke[]>(layer.strokes);
  const toolRef = useRef(tool);
  const widthRef = useRef(strokeWidth);
  const visibleRef = useRef(visible);
  const currentRef = useRef<InkStroke | null>(null);
  const [, bump] = useState(0);

  toolRef.current = tool;
  widthRef.current = strokeWidth;
  visibleRef.current = visible;

  useEffect(() => {
    strokesRef.current = layer.strokes;
    bump((n) => n + 1);
  }, [layer.id, layer.strokes]);

  useEffect(() => {
    currentRef.current = null;
    bump((n) => n + 1);
  }, [tool, strokeWidth]);

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
    const activeTool = toolRef.current;
    const next =
      activeTool === 'eraser'
        ? strokesRef.current.filter((s) => s.tool !== 'eraser' && !strokeIntersects(cur, s))
        : [...strokesRef.current, cur];
    strokesRef.current = next;
    currentRef.current = null;
    onStrokesChange(next);
    bump((n) => n + 1);
  }, [onStrokesChange]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => visibleRef.current,
      onMoveShouldSetPanResponder: () => visibleRef.current,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const activeTool = toolRef.current;
        const { locationX: x, locationY: y } = evt.nativeEvent;
        const spec = TOOL_COLORS[activeTool];
        currentRef.current = {
          id: `stroke_${Date.now()}`,
          tool: activeTool,
          points: [{ x, y }],
          width: widthRef.current,
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

  const eraserPreview =
    currentRef.current?.tool === 'eraser' ? currentRef.current : null;

  const display = [
    ...strokesRef.current.filter((s) => s.tool !== 'eraser'),
    ...(currentRef.current && currentRef.current.tool !== 'eraser' ? [currentRef.current] : []),
  ];

  return (
    <View style={[styles.wrap, { height }, style]} onLayout={onLayout} {...pan.panHandlers}>
      <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill}>
        {display.map((s) => {
          const spec = TOOL_COLORS[s.tool];
          return (
            <Path
              key={s.id}
              d={pointsToPath(s.points)}
              stroke={spec.color}
              strokeWidth={s.width}
              strokeOpacity={spec.opacity}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
        {eraserPreview && (
          <Path
            d={pointsToPath(eraserPreview.points)}
            stroke={TOOL_COLORS.eraser.color}
            strokeWidth={eraserPreview.width}
            strokeOpacity={eraserPreview.opacity}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'transparent',
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
  },
});
