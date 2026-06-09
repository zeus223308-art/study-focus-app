import { Platform, StyleSheet } from 'react-native';

import { theme } from '@/constants/theme';
import type { ViewStyle } from 'react-native';

/** Mobile web: 1px lines — hairlineWidth often vanishes on iOS Safari inside overflow:hidden. */
export const WEB_LINE = Platform.OS === 'web' ? 1 : StyleSheet.hairlineWidth;

export const webHairlineTop: ViewStyle = {
  borderTopWidth: WEB_LINE,
  borderTopColor: theme.grayLight,
};

export const webHairlineBottom: ViewStyle = {
  borderBottomWidth: WEB_LINE,
  borderBottomColor: theme.grayLight,
};
