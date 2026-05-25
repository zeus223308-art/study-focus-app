export type BlackoutPhase = 'idle' | 'countdown' | 'blackout' | 'revealed';

/** Recall countdown length options (seconds, counts down to 1). */
export const RECALL_COUNTDOWN_OPTIONS = [3, 5, 10, 15, 30] as const;

export function buildCountdownSteps(totalSeconds: number): number[] {
  const n = Math.max(1, Math.min(30, Math.round(totalSeconds)));
  return Array.from({ length: n }, (_, i) => n - i);
}

/** @deprecated Use buildCountdownSteps(3) */
export const BLACKOUT_COUNTDOWN = buildCountdownSteps(3);

export function nextBlackoutPhase(phase: BlackoutPhase): BlackoutPhase {
  if (phase === 'idle') return 'countdown';
  if (phase === 'countdown') return 'blackout';
  if (phase === 'blackout') return 'revealed';
  return 'revealed';
}
