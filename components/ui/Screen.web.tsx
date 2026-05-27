import { forwardRef, ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dockTopContentInset } from '@/components/DockTabBar';
import { theme } from '@/constants/theme';
import { useViewportLayout } from '@/lib/ui/viewport-layout';

const SCROLL_BOTTOM_PAD = 24;

type Props = {
  children: ReactNode;
  scroll?: boolean;
  scrollEnabled?: boolean;
  /** Locks vertical pan on the page (vault folder drag). */
  lockVerticalPan?: boolean;
  style?: ViewStyle;
  padded?: boolean;
  nestedScrollEnabled?: boolean;
};

/** Web: RN ScrollView (gesture-handler ScrollView breaks nested touch on mobile Safari). */
export const Screen = forwardRef<ScrollView, Props>(function Screen(
  { children, scroll, scrollEnabled = true, lockVerticalPan = false, style, padded = true },
  ref
) {
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
        ref={ref}
        style={[styles.root, lockVerticalPan && styles.rootLocked]}
        scrollEnabled={scrollEnabled}
        contentContainerStyle={{ paddingBottom: insets.bottom + SCROLL_BOTTOM_PAD }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled>
        {inner}
      </ScrollView>
    );
  }
  return <View style={[styles.root, { paddingBottom: insets.bottom }]}>{inner}</View>;
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.beige,
    WebkitOverflowScrolling: 'touch',
  } as ViewStyle,
  rootLocked: {
    touchAction: 'pan-x',
    overflow: 'hidden',
  } as ViewStyle,
});
