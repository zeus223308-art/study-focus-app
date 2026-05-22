import { ReactNode } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { useWindowDimensions } from 'react-native';

import { theme } from '@/constants/theme';

/** iPhone 14 class width — web preview matches native phone layout */
export const MOBILE_FRAME_WIDTH = 390;

type Props = {
  children: ReactNode;
};

const WEB_BEZEL: ViewStyle =
  Platform.OS === 'web'
    ? ({
        marginVertical: 16,
        borderRadius: 36,
        borderWidth: 10,
        borderColor: '#0D0D0D',
        boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
      } as ViewStyle)
    : {};

/**
 * On web, centers the app in a phone-sized column so desktop browsers
 * preview the same layout as Expo Go on a real device.
 */
export function MobileWebFrame({ children }: Props) {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  const { width: windowWidth } = useWindowDimensions();
  const showBezel = windowWidth > MOBILE_FRAME_WIDTH + 48;
  const frameWidth = Math.min(MOBILE_FRAME_WIDTH, windowWidth);

  return (
    <View style={styles.shell}>
      <View style={[styles.frame, { width: frameWidth }, showBezel && WEB_BEZEL]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    width: '100%',
    backgroundColor: '#2A2826',
    alignItems: 'center',
  },
  frame: {
    flex: 1,
    backgroundColor: theme.beige,
    overflow: 'hidden',
  },
});
