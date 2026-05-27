import { TRIPLE_TAP_MERGE_MS } from '@/lib/ui/hold-drag';

/** Shared triple-tap → hold-to-merge gesture state (native + web HoldDragSurface). */
export type MergeTapRefs = {
  tapCount: { current: number };
  lastReleaseAt: { current: number };
  mergeArmed: { current: boolean };
};

export function shouldMergeHoldOnTouchStart(
  refs: MergeTapRefs,
  hasMergeHold: boolean,
  now = Date.now()
): boolean {
  if (!hasMergeHold) return false;
  const sinceRelease = now - refs.lastReleaseAt.current;
  if (sinceRelease > TRIPLE_TAP_MERGE_MS) {
    refs.tapCount.current = 0;
  }
  return (
    refs.mergeArmed.current ||
    (refs.tapCount.current >= 2 && sinceRelease < TRIPLE_TAP_MERGE_MS)
  );
}

export function onMergeTouchRelease(
  refs: MergeTapRefs,
  opts: {
    wasMergePending: boolean;
    movedTooFar: boolean;
    hasMergeHold: boolean;
    now?: number;
  }
): void {
  const now = opts.now ?? Date.now();
  if (!opts.hasMergeHold) return;

  if (opts.wasMergePending) {
    if (!opts.movedTooFar) {
      refs.mergeArmed.current = true;
    }
    refs.tapCount.current = 0;
    return;
  }

  if (opts.movedTooFar) return;

  if (now - refs.lastReleaseAt.current < TRIPLE_TAP_MERGE_MS) {
    refs.tapCount.current += 1;
  } else {
    refs.tapCount.current = 1;
  }
  refs.lastReleaseAt.current = now;

  if (refs.tapCount.current >= 2) {
    refs.mergeArmed.current = true;
    refs.tapCount.current = 0;
  }
}

export function clearMergeTapState(refs: MergeTapRefs): void {
  refs.tapCount.current = 0;
  refs.mergeArmed.current = false;
}
