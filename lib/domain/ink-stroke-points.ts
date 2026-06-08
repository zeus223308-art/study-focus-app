import type { InkPoint } from './types';

/** Max gap between recorded points so fast strokes (e.g. circles) stay continuous. */
const INK_SAMPLE_STEP_PX = 3;

export function appendInkPoint(points: InkPoint[], x: number, y: number): InkPoint[] {
  if (points.length === 0) return [{ x, y }];

  const last = points[points.length - 1];
  const dx = x - last.x;
  const dy = y - last.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.35) return points;

  if (dist <= INK_SAMPLE_STEP_PX) {
    return [...points, { x, y }];
  }

  const steps = Math.ceil(dist / INK_SAMPLE_STEP_PX);
  const next = [...points];
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    next.push({ x: last.x + dx * t, y: last.y + dy * t });
  }
  return next;
}

/** Ensure at least two points so commit/render accepts tap dots and quick flicks. */
export function finalizeInkStrokePoints(points: InkPoint[]): InkPoint[] {
  if (points.length === 0) return points;
  if (points.length >= 2) return points;
  const p = points[0];
  return [p, { x: p.x + 0.5, y: p.y + 0.5 }];
}
