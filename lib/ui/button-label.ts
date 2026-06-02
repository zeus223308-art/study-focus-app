import type { TextStyle } from 'react-native';

import { theme } from '@/constants/theme';

/**
 * Action button label sizes (use with `Button` or matching Pressable rows).
 * - default / emphasis: 15px — primary & modal confirm/cancel rows
 * - compact: 13px — toolbar, camera overlay, folder action pills
 */
export const BUTTON_LABEL_DEFAULT: TextStyle = {
  fontSize: theme.font.button,
  fontWeight: '700',
  lineHeight: 20,
};

export const BUTTON_LABEL_EMPHASIS: TextStyle = {
  fontSize: theme.font.button,
  fontWeight: '800',
  lineHeight: 20,
};

export const BUTTON_LABEL_COMPACT: TextStyle = {
  fontSize: theme.font.buttonCompact,
  fontWeight: '700',
  lineHeight: 16,
};

/** Tertiary text actions (retake, ghost links). */
export const BUTTON_LABEL_LINK: TextStyle = {
  fontSize: theme.font.buttonCompact,
  fontWeight: '600',
  lineHeight: 16,
};
