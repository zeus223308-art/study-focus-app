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
import type { InkPoint, InkStroke, InkToolId } from '@/lib/domain/types';

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

export type RecallTool = 'pen-black' | 'eraser';

type Props = {
  strokes: InkStroke[];
  onStrokesChange: (strokes: InkStroke[]) => void;
  tool: RecallTool;
  fullScreen?: boolean;
};

/** White scratch layer for active recall during blackout */
export function RecallCanvas({ strokes, onStrokesChange, tool, fullScreen }: Props) {
  const [size, setSize] = useState({ w: 320, h: 240 });
  const strokesRef = useRef(strokes);
  const toolRef = useRef(tool);
  const currentRef = useRef<InkStroke | null>(null);
  const [, bump] = useState(0);

  strokesRef.current = strokes;
  toolRef.current = tool;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
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
        ? strokesRef.current.filter((s) => !strokeIntersects(cur, s))
        : [...strokesRef.current, cur];
    onStrokesChange(next);
    currentRef.current = null;
    bump((n) => n + 1);
  }, [onStrokesChange]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const activeTool = toolRef.current;
        const { locationX: x, locationY: y } = evt.nativeEvent;
        currentRef.current = {
          id: `recall_${Date.now()}`,
          tool: activeTool as InkToolId,
          points: [{ x, y }],
          width: activeTool === 'eraser' ? 28 : 2.5,
          opacity: activeTool === 'eraser' ? 0.35 : 1,
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

  useEffect(() => {
    currentRef.current = null;
  }, [tool]);

  const display = [
    ...strokes,
    ...(currentRef.current?.tool !== 'eraser' && currentRef.current ? [currentRef.current] : []),
  ];

  const eraserPreview =
    currentRef.current?.tool === 'eraser' ? currentRef.current : null;

  return (
    <View
      style={[styles.wrap, fullScreen && styles.wrapFull]}
      onLayout={onLayout}
      {...pan.panHandlers}>
      <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill}>
        {display.map((s) => (
          <Path
            key={s.id}
            d={pointsToPath(s.points)}
            stroke={theme.inkDefault}
            strokeWidth={s.width}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {eraserPreview && (
          <Path
            d={pointsToPath(eraserPreview.points)}
            stroke={theme.grayLight}
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
    flex: 1,
    minHeight: 200,
    backgroundColor: theme.paper,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.grayLight,
    overflow: 'hidden',
  },
  wrapFull: {
    flex: 1,
    minHeight: 0,
    borderRadius: theme.radius.lg,
    borderWidth: 0,
  },
});
