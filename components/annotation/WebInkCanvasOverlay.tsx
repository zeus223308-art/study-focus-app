import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { drawInkStrokeOnCanvas, inkPointsToPath } from '@/lib/domain/draw-ink-stroke';
import { INK_STROKE_STYLES } from '@/lib/domain/ink-stroke-style';
import type { InkStroke } from '@/lib/domain/types';

type Props = {
  width: number;
  height: number;
  strokes: InkStroke[];
  eraserPreview: InkStroke | null;
};

/**
 * Web-only ink layer — HTML canvas avoids SVG currentColor / forced-color bugs
 * (black pen drawing gray, white swatch showing black).
 */
export function WebInkCanvasOverlay({ width, height, strokes, eraserPreview }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || width < 1 || height < 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    for (const stroke of strokes) {
      drawInkStrokeOnCanvas(ctx, stroke);
    }

    if (eraserPreview && eraserPreview.points.length >= 2) {
      ctx.save();
      ctx.strokeStyle = INK_STROKE_STYLES.eraser.color;
      ctx.lineWidth = eraserPreview.width;
      ctx.globalAlpha = eraserPreview.opacity;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke(new Path2D(inkPointsToPath(eraserPreview.points)));
      ctx.restore();
    }
  }, [width, height, strokes, eraserPreview]);

  if (Platform.OS !== 'web') return null;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.wrap]}>
      <canvas
        ref={(node) => {
          canvasRef.current = node;
        }}
        style={styles.canvas}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  canvas: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  } as object,
});
