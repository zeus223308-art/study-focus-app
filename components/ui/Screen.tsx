import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { dockTopContentInset } from '@/components/DockTabBar';
import { theme } from '@/constants/theme';
import { useViewportLayout } from '@/lib/ui/viewport-layout';

const SCROLL_BOTTOM_PAD = 24;

type Props = {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  padded?: boolean;
  nestedScrollEnabled?: boolean;
};

export function Screen({ children, scroll, style, padded = true, nestedScrollEnabled }: Props) {
  const insets = useSafeAreaInsets();
  const viewport = useViewportLayout();
  const pad = padded ? (viewport.isPhone ? 20 : viewport.horizontalPadding) : 0;

  const innerBody = (
    <View
      style={[{ paddingTop: dockTopContentInset(insets.top), paddingHorizontal: pad }, style]}>
      {children}
    </View>
  );

  const inner =
    padded && viewport.isTablet ? (
      <View
        style={{
          width: '100%',
          maxWidth: viewport.contentMaxWidth,
          alignSelf: 'center',
        }}>
        {innerBody}
      </View>
    ) : (
      innerBody
    );

  if (scroll) {
    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={{ paddingBottom: insets.bottom + SCROLL_BOTTOM_PAD }}
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
