import { theme } from '@/constants/theme';

/** Background fill opacity — 75% transparent (25% visible). */
export const MEMO_TEXT_BOX_BG_OPACITY = 0.25;

export function memoTextBoxSurface() {
  return {
    backgroundColor: `rgba(255,255,255,${MEMO_TEXT_BOX_BG_OPACITY})`,
    textColor: theme.black,
    placeholderColor: theme.gray,
    hintColor: theme.gray,
  };
}
