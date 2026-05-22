export type BlackoutPhase = 'idle' | 'countdown' | 'blackout' | 'revealed';

export const BLACKOUT_COUNTDOWN = [3, 2, 1] as const;

export function nextBlackoutPhase(phase: BlackoutPhase): BlackoutPhase {
  if (phase === 'idle') return 'countdown';
  if (phase === 'countdown') return 'blackout';
  if (phase === 'blackout') return 'revealed';
  return 'revealed';
}
