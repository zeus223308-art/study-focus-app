import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PanResponder,
  Platform,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { InkStrokePath } from '@/components/annotation/InkStrokePath';
import { WebInkCanvasOverlay } from '@/components/annotation/WebInkCanvasOverlay';
import { theme } from '@/constants/theme';
import { INK_STROKE_STYLES, strokeStyleForTool } from '@/lib/domain/ink-stroke-style';
import { scaleStrokesToViewport } from '@/lib/files/bake-capture-ink';
import type { InkPoint, InkStroke, InkToolId, NoteLayer } from '@/lib/domain/types';

function pointsToPath(points: InkPoint[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  return `M ${first.x} ${first.y} ${rest.map((p) => `L ${p.x} ${p.y}`).join(' ')}`;
}

function pointSegmentDistance(p: InkPoint, a: InkPoint, b: InkPoint): number {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const wx = p.x - a.x;
  const wy = p.y - a.y;
  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.hypot(p.x - b.x, p.y - b.y);
  const t = c1 / c2;
  const projX = a.x + t * vx;
  const projY = a.y + t * vy;
  return Math.hypot(p.x - projX, p.y - projY);
}

function strokeIntersects(eraser: InkStroke, stroke: InkStroke): boolean {
  if (eraser.points.length < 1 || stroke.points.length < 1) return false;
  const pad = Math.max(3, eraser.width * 0.5);
  if (stroke.points.length === 1) {
    const q = stroke.points[0];
    return eraser.points.some((p) => Math.hypot(p.x - q.x, p.y - q.y) <= pad);
  }
  for (const p of eraser.points) {
    for (let i = 1; i < stroke.points.length; i += 1) {
      const a = stroke.points[i - 1];
      const b = stroke.points[i];
      if (pointSegmentDistance(p, a, b) <= pad) return true;
    }
  }
  return false;
}

type Props = {
  layer: NoteLayer;
  tool: InkToolId;
  strokeWidth: number;
  visible: boolean;
  /** When false, strokes render but pan drawing is disabled */
  interactive?: boolean;
  onStrokesChange: (strokes: InkStroke[]) => void;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

export function AnnotationCanvas({
  layer,
  tool,
  strokeWidth,
  visible,
  interactive = true,
  onStrokesChange,
  height = 280,
  style,
}: Props) {
  const [size, setSize] = useState({ w: 320, h: height });
  const strokesRef = useRef<InkStroke[]>(layer.strokes);
  const toolRef = useRef(tool);
  const widthRef = useRef(strokeWidth);
  const visibleRef = useRef(visible);
  const interactiveRef = useRef(interactive);
  const currentRef = useRef<InkStroke | null>(null);
  const [, bump] = useState(0);

  toolRef.current = tool;
  widthRef.current = strokeWidth;
  visibleRef.current = visible;
  interactiveRef.current = interactive;

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
        ? (() => {
            const scaled = scaleStrokesToViewport(
              strokesRef.current,
              size.w,
              size.h,
              layer.strokeSpace
            );
            const eraseIds = new Set<string>();
            for (const s of scaled) {
              if (s.tool === 'eraser') continue;
              if (strokeIntersects(cur, s)) eraseIds.add(s.id);
            }
            return strokesRef.current.filter((s) => !eraseIds.has(s.id));
          })()
        : [...strokesRef.current, cur];
    strokesRef.current = next;
    currentRef.current = null;
    onStrokesChange(next);
    bump((n) => n + 1);
  }, [layer.strokeSpace, onStrokesChange, size.h, size.w]);

  const lockedRef = useRef(layer.locked);
  lockedRef.current = layer.locked;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () =>
        visibleRef.current && interactiveRef.current && !lockedRef.current,
      onMoveShouldSetPanResponder: () =>
        visibleRef.current && interactiveRef.current && !lockedRef.current,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const activeTool = toolRef.current;
        const { locationX: x, locationY: y } = evt.nativeEvent;
        const spec = strokeStyleForTool(activeTool, widthRef.current);
        currentRef.current = {
          id: `stroke_${Date.now()}`,
          tool: activeTool,
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

  const eraserPreview =
    currentRef.current?.tool === 'eraser' ? currentRef.current : null;

  const scaledStrokes = scaleStrokesToViewport(
    strokesRef.current,
    size.w,
    size.h,
    layer.strokeSpace
  );
  const scaledCurrent =
    currentRef.current && currentRef.current.tool !== 'eraser'
      ? scaleStrokesToViewport([currentRef.current], size.w, size.h, layer.strokeSpace)[0]
      : null;

  const display = [
    ...scaledStrokes.filter((s) => s.tool !== 'eraser'),
    ...(scaledCurrent ? [scaledCurrent] : []),
  ];

  return (
    <View
      style={[styles.wrap, { height }, style]}
      onLayout={onLayout}
      {...pan.panHandlers}
      {...(Platform.OS === 'web' ? { dataSet: { inkCanvas: '1' } } : {})}>
      {Platform.OS === 'web' ? (
        <WebInkCanvasOverlay
          width={size.w}
          height={size.h}
          strokes={display}
          eraserPreview={eraserPreview}
        />
      ) : (
        <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill}>
          {display.map((s) => (
            <InkStrokePath
              key={s.id}
              id={s.id}
              tool={s.tool}
              points={s.points}
              width={s.width}
              opacity={s.opacity}
            />
          ))}
          {eraserPreview && (
            <Path
              d={pointsToPath(eraserPreview.points)}
              stroke={INK_STROKE_STYLES.eraser.color}
              strokeWidth={eraserPreview.width}
              strokeOpacity={eraserPreview.opacity}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </Svg>
      )}
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
