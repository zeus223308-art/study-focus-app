import { StyleSheet, View, type ViewStyle } from 'react-native';

import { theme } from '@/constants/theme';
import { WEB_LINE } from '@/lib/ui/web-divider';

/** Solid 1px row divider — reliable on iOS Safari and Android Chrome mobile web. */
export function WebDividerLine({ style }: { style?: ViewStyle }) {
  return <View style={[styles.line, style]} />;
}

const styles = StyleSheet.create({
  line: {
    height: WEB_LINE,
    backgroundColor: theme.grayLight,
    alignSelf: 'stretch',
  },
});
