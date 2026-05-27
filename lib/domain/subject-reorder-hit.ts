export type ZoneRect = { x: number; y: number; width: number; height: number };

export type SubjectReorderHit =
  | { kind: 'merge'; targetId: string }
  | { kind: 'insert'; index: number; lineX: number };

const GAP_HIT_PAD = 10;
const MERGE_INSET_X = 0.22;

type ZoneEntry = { id: string; rect: ZoneRect };

function inRow(pageY: number, rect: ZoneRect): boolean {
  return pageY >= rect.y && pageY <= rect.y + rect.height;
}

/**
 * Horizontal vault carousel: gap between tiles → insert line; tile center → merge.
 */
export function hitTestSubjectReorderDrag(
  pageX: number,
  pageY: number,
  zones: Map<string, ZoneRect>,
  activeId: string,
  sortedIds: string[]
): SubjectReorderHit | null {
  const entries: ZoneEntry[] = sortedIds
    .map((id) => {
      const rect = zones.get(id);
      return rect ? { id, rect } : null;
    })
    .filter((e): e is ZoneEntry => e != null);

  if (entries.length === 0) return null;

  for (const { id, rect } of entries) {
    if (id === activeId || !inRow(pageY, rect)) continue;
    const mergeLeft = rect.x + rect.width * MERGE_INSET_X;
    const mergeRight = rect.x + rect.width * (1 - MERGE_INSET_X);
    if (pageX >= mergeLeft && pageX <= mergeRight) {
      return { kind: 'merge', targetId: id };
    }
  }

  const rowRect = entries[0]!.rect;

  const first = entries[0]!;
  if (
    pageX < first.rect.x + GAP_HIT_PAD &&
    inRow(pageY, first.rect)
  ) {
    return { kind: 'insert', index: 0, lineX: first.rect.x };
  }

  for (let i = 0; i < entries.length - 1; i++) {
    const left = entries[i]!;
    const right = entries[i + 1]!;
    const gapStart = left.rect.x + left.rect.width;
    const gapEnd = right.rect.x;
    if (
      pageX >= gapStart - GAP_HIT_PAD &&
      pageX <= gapEnd + GAP_HIT_PAD &&
      inRow(pageY, left.rect)
    ) {
      const insertIndex = sortedIds.indexOf(right.id);
      const lineX = (gapStart + gapEnd) / 2;
      return { kind: 'insert', index: insertIndex >= 0 ? insertIndex : i + 1, lineX };
    }
  }

  const last = entries[entries.length - 1]!;
  if (
    pageX > last.rect.x + last.rect.width - GAP_HIT_PAD &&
    inRow(pageY, last.rect)
  ) {
    return {
      kind: 'insert',
      index: sortedIds.length,
      lineX: last.rect.x + last.rect.width,
    };
  }

  return null;
}

export function rowBoundsFromZones(zones: Map<string, ZoneRect>): ZoneRect | null {
  let top = Infinity;
  let bottom = -Infinity;
  for (const rect of zones.values()) {
    top = Math.min(top, rect.y);
    bottom = Math.max(bottom, rect.y + rect.height);
  }
  if (!Number.isFinite(top)) return null;
  return { x: 0, y: top, width: 0, height: bottom - top };
}
