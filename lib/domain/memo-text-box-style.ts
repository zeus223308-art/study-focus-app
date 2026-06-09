import { theme } from '@/constants/theme';
import type { MemoTextBoxTone } from '@/lib/domain/types';

export const MEMO_TEXT_BOX_DEFAULT_FILL = 0.25;
const MAX_FILL_ALPHA = 0.88;

export function normalizeMemoTextBoxFill(fill?: number | null): number {
  if (typeof fill !== 'number' || !Number.isFinite(fill)) return MEMO_TEXT_BOX_DEFAULT_FILL;
  return Math.max(0, Math.min(1, fill));
}

export function normalizeMemoTextBoxTone(tone?: string | null): MemoTextBoxTone {
  return tone === 'dark' ? 'dark' : 'light';
}

export function memoTextBoxSurface(tone: MemoTextBoxTone, fillLevel: number) {
  const fill = normalizeMemoTextBoxFill(fillLevel);
  const alpha = fill * MAX_FILL_ALPHA;

  if (tone === 'dark') {
    return {
      backgroundColor: `rgba(0,0,0,${alpha})`,
      textColor: fill >= 0.35 ? theme.white : theme.black,
      placeholderColor: fill >= 0.35 ? 'rgba(255,255,255,0.55)' : theme.gray,
      hintColor: fill >= 0.35 ? 'rgba(255,255,255,0.75)' : theme.gray,
      sliderKnobColor: theme.white,
    };
  }

  return {
    backgroundColor: fill <= 0.02 ? 'transparent' : `rgba(255,255,255,${alpha})`,
    textColor: theme.black,
    placeholderColor: theme.gray,
    hintColor: theme.gray,
    sliderKnobColor: fill >= 0.72 ? theme.white : theme.black,
  };
}
