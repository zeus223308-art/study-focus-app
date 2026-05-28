import { Platform } from 'react-native';

import { drawInkStrokeOnCanvas, inkPointsToPath } from '@/lib/domain/draw-ink-stroke';
import type { InkStroke } from '@/lib/domain/types';

import {
  cropRegionFromSelection,
  imageDisplayRect,
  type CropSelection,
} from './interactive-crop';

/** Map overlay strokes (0..displayW) into cropped image pixel coordinates. */
export function mapStrokesToCroppedImage(
  strokes: InkStroke[],
  selection: CropSelection,
  displayRect: { left: number; top: number; width: number; height: number }
): InkStroke[] {
  const region = cropRegionFromSelection(selection);
  const { crop } = selection;
  const sx = region.width / crop.width;
  const sy = region.height / crop.height;

  return strokes
    .filter((s) => s.tool !== 'eraser' && s.points.length >= 2)
    .map((s) => ({
      ...s,
      width: s.width * Math.max(sx, sy),
      points: s.points.map((p) => {
        const vx = displayRect.left + p.x;
        const vy = displayRect.top + p.y;
        return {
          x: Math.max(0, Math.min(region.width, (vx - crop.left) * sx)),
          y: Math.max(0, Math.min(region.height, (vy - crop.top) * sy)),
        };
      }),
    }));
}

async function loadHtmlImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!uri.startsWith('blob:') && !uri.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = uri;
  });
}

/** Bake strokes onto a JPEG (web only). Returns original uri when unavailable. */
export async function bakeStrokesOntoImageUri(
  imageUri: string,
  strokes: InkStroke[],
  imageWidth: number,
  imageHeight: number
): Promise<string> {
  if (Platform.OS !== 'web' || strokes.length === 0) return imageUri;
  if (typeof document === 'undefined') return imageUri;

  const img = await loadHtmlImage(imageUri);
  const canvas = document.createElement('canvas');
  canvas.width = imageWidth;
  canvas.height = imageHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return imageUri;

  ctx.drawImage(img, 0, 0, imageWidth, imageHeight);
  for (const stroke of strokes) {
    drawInkStrokeOnCanvas(ctx, stroke, 1);
  }

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92);
  });
  if (!blob) return imageUri;

  return URL.createObjectURL(blob);
}

export function normalizeStrokesForImage(
  strokes: InkStroke[],
  imageWidth: number,
  imageHeight: number
): InkStroke[] {
  if (imageWidth < 1 || imageHeight < 1) return strokes;
  return strokes.map((s) => ({
    ...s,
    points: s.points.map((p) => ({
      x: p.x / imageWidth,
      y: p.y / imageHeight,
    })),
    width: s.width / Math.max(imageWidth, imageHeight),
  }));
}

export function scaleStrokesToViewport(
  strokes: InkStroke[],
  viewportWidth: number,
  viewportHeight: number,
  strokeSpace?: 'viewport' | 'normalized'
): InkStroke[] {
  if (strokeSpace !== 'normalized' || viewportWidth < 1 || viewportHeight < 1) {
    return strokes;
  }
  const scale = Math.max(viewportWidth, viewportHeight);
  return strokes.map((s) => ({
    ...s,
    points: s.points.map((p) => ({
      x: p.x * viewportWidth,
      y: p.y * viewportHeight,
    })),
    width: s.width * scale,
  }));
}

export function captureDisplayRect(selection: CropSelection) {
  return imageDisplayRect(selection);
}

/** Map overlay strokes to full image pixels (before crop). */
export function mapStrokesToFullImage(
  strokes: InkStroke[],
  selection: CropSelection,
  displayRect: { left: number; top: number; width: number; height: number }
): InkStroke[] {
  const image = imageDisplayRect(selection);
  const scale = image.scale;
  if (scale < 1e-6) return strokes;

  return strokes
    .filter((s) => s.tool !== 'eraser' && s.points.length >= 2)
    .map((s) => ({
      ...s,
      width: s.width / scale,
      points: s.points.map((p) => ({
        x: Math.max(0, Math.min(selection.imageWidth, p.x / scale)),
        y: Math.max(0, Math.min(selection.imageHeight, p.y / scale)),
      })),
    }));
}
