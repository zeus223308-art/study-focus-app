import { theme } from '@/constants/theme';
import type { MemoTextBoxTone } from '@/lib/domain/types';

export const MEMO_TEXT_BOX_BG_OPACITY = 0.5;

export function normalizeMemoTextBoxTone(tone?: string | null): MemoTextBoxTone {
  return tone === 'dark' ? 'dark' : 'light';
}

export function memoTextBoxSurface(tone: MemoTextBoxTone) {
  if (tone === 'dark') {
    return {
      backgroundColor: `rgba(0,0,0,${MEMO_TEXT_BOX_BG_OPACITY})`,
      textColor: theme.white,
      placeholderColor: 'rgba(255,255,255,0.55)',
      hintColor: 'rgba(255,255,255,0.7)',
    };
  }
  return {
    backgroundColor: `rgba(255,255,255,${MEMO_TEXT_BOX_BG_OPACITY})`,
    textColor: theme.black,
    placeholderColor: theme.gray,
    hintColor: theme.gray,
  };
}
