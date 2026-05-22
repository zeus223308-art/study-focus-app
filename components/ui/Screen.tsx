import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  padded?: boolean;
  nestedScrollEnabled?: boolean;
};

export function Screen({ children, scroll, style, padded = true, nestedScrollEnabled }: Props) {
  const insets = useSafeAreaInsets();
  const pad = padded ? 20 : 0;

  const inner = (
    <View style={[{ paddingTop: insets.top + 8, paddingHorizontal: pad }, style]}>{children}</View>
  );

  if (scroll) {
    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={nestedScrollEnabled}>
        {inner}
      </ScrollView>
    );
  }
  return <View style={[styles.root, { paddingBottom: insets.bottom }]}>{inner}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.beige },
});
