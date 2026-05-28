import { displayStrokeColor } from '@/lib/domain/ink-stroke-style';
import type { InkPoint, InkStroke } from '@/lib/domain/types';

export function inkPointsToPath(points: InkPoint[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  return `M ${first.x} ${first.y} ${rest.map((p) => `L ${p.x} ${p.y}`).join(' ')}`;
}

/** Draw one stroke on a 2D canvas (web overlay + bake). Color always from stroke.tool. */
export function drawInkStrokeOnCanvas(
  ctx: CanvasRenderingContext2D,
  stroke: InkStroke,
  scale = 1
): void {
  if (stroke.tool === 'eraser' || stroke.points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = displayStrokeColor(stroke.tool);
  ctx.lineWidth = stroke.width * scale;
  ctx.globalAlpha = stroke.opacity;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(new Path2D(inkPointsToPath(stroke.points)));
  ctx.restore();
}
