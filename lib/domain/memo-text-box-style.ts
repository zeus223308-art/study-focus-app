import { theme } from '@/constants/theme';
import type { MemoTextBoxTone } from '@/lib/domain/types';

/** Fully transparent — text only, no fill over the photo */
export const MEMO_TEXT_BOX_BG_OPACITY = 0;

export function normalizeMemoTextBoxTone(tone?: string | null): MemoTextBoxTone {
  return tone === 'dark' ? 'dark' : 'light';
}

export function memoTextBoxSurface(tone: MemoTextBoxTone) {
  const transparent = 'transparent';
  if (tone === 'dark') {
    return {
      backgroundColor: transparent,
      textColor: theme.white,
      placeholderColor: 'rgba(255,255,255,0.55)',
      hintColor: 'rgba(255,255,255,0.7)',
    };
  }
  return {
    backgroundColor: transparent,
    textColor: theme.black,
    placeholderColor: theme.gray,
    hintColor: theme.gray,
  };
}
