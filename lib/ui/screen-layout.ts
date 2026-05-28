import { StyleSheet } from 'react-native';

import { theme } from '@/constants/theme';

/** Flex column screens: child ScrollViews need minHeight 0 to scroll (web + native). */
export const screenLayoutStyles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, backgroundColor: theme.beige },
  rootFill: { flex: 1, minHeight: 0 },
  fillColumn: { flex: 1, minHeight: 0 },
  shrink0: { flexShrink: 0 },
});
