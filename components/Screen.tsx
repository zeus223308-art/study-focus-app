import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
};

export function Screen({ children, scroll, style }: Props) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const content = (
    <View style={[styles.inner, { paddingTop: insets.top + 8 }, style]}>{children}</View>
  );

  if (scroll) {
    return (
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}>
        {content}
      </ScrollView>
    );
  }

  return <View style={[styles.root, { backgroundColor: colors.background }]}>{content}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 20 },
});
