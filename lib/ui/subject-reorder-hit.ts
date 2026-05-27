import { subjectReorderGapKey } from '@/lib/domain/reorder';

export type ZoneRect = { x: number; y: number; width: number; height: number };

/** Min touch width for gap drops (finger target between cards). */
export const SUBJECT_GAP_HIT_MIN = 44;

export function hitTestZoneAt(
  pageX: number,
  pageY: number,
  zones: Map<string, ZoneRect>
): string | null {
  for (const [key, rect] of zones.entries()) {
    if (
      pageX >= rect.x &&
      pageX <= rect.x + rect.width &&
      pageY >= rect.y &&
      pageY <= rect.y + rect.height
    ) {
      return key;
    }
  }
  return null;
}

/** Gap hit test: registered zones first, then midpoint between measured tile rects. */
export function resolveSubjectReorderGapKey(
  pageX: number,
  pageY: number,
  gapZones: Map<string, ZoneRect>,
  tileZones: Map<string, ZoneRect>,
  sortedSubjectIds: string[]
): string | null {
  const direct = hitTestZoneAt(pageX, pageY, gapZones);
  if (direct) return direct;

  const tiles = sortedSubjectIds
    .map((id) => ({ id, rect: tileZones.get(id) }))
    .filter((t): t is { id: string; rect: ZoneRect } => Boolean(t.rect?.width));
  if (tiles.length === 0) return null;

  const inRowY = tiles.some(
    (t) => pageY >= t.rect.y && pageY <= t.rect.y + t.rect.height
  );
  if (!inRowY) return null;

  const half = SUBJECT_GAP_HIT_MIN / 2;
  const first = tiles[0]!.rect;
  if (pageX <= first.x + half) return subjectReorderGapKey(0);

  for (let i = 0; i < tiles.length - 1; i++) {
    const left = tiles[i]!.rect;
    const right = tiles[i + 1]!.rect;
    const mid = (left.x + left.width + right.x) / 2;
    if (Math.abs(pageX - mid) <= half) return subjectReorderGapKey(i + 1);
  }

  const last = tiles[tiles.length - 1]!.rect;
  if (pageX >= last.x + last.width - half) {
    return subjectReorderGapKey(tiles.length);
  }

  return null;
}

/** Merge drop: tile under finger (excluding source). */
export function resolveSubjectMergeTargetId(
  pageX: number,
  pageY: number,
  tileZones: Map<string, ZoneRect>,
  sortedSubjectIds: string[],
  sourceSubjectId: string
): string | null {
  const direct = hitTestZoneAt(pageX, pageY, tileZones);
  if (direct && direct !== sourceSubjectId) return direct;

  let best: { id: string; dist: number } | null = null;
  for (const id of sortedSubjectIds) {
    if (id === sourceSubjectId) continue;
    const rect = tileZones.get(id);
    if (!rect) continue;
    if (
      pageX < rect.x ||
      pageX > rect.x + rect.width ||
      pageY < rect.y ||
      pageY > rect.y + rect.height
    ) {
      continue;
    }
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    const dist = (pageX - cx) ** 2 + (pageY - cy) ** 2;
    if (!best || dist < best.dist) best = { id, dist };
  }
  return best?.id ?? null;
}
