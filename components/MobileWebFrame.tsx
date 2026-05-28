import { ReactNode } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { useWindowDimensions } from 'react-native';

import { theme } from '@/constants/theme';
import { getDeviceClass } from '@/lib/ui/viewport-layout';

/** iPhone 14 class width — default web phone preview */
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

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const deviceClass = getDeviceClass(windowWidth, windowHeight);
  const isLandscape = windowWidth > windowHeight;
  const phoneLandscapeFullBleed = isLandscape && deviceClass === 'phone';
  const frameWidth = phoneLandscapeFullBleed
    ? windowWidth
    : isLandscape
      ? Math.min(
          deviceClass === 'largeTablet' ? 1200 : deviceClass === 'tablet' ? 960 : windowWidth,
          windowWidth - (deviceClass === 'phone' ? 16 : 24)
        )
      : deviceClass === 'largeTablet'
        ? Math.min(1100, windowWidth - 48)
        : deviceClass === 'tablet'
          ? Math.min(820, windowWidth - 48)
          : Math.min(MOBILE_FRAME_WIDTH, windowWidth);
  const showBezel = !phoneLandscapeFullBleed && windowWidth > frameWidth + 48;

  return (
    <View style={styles.shell}>
      <View style={[styles.frame, { width: frameWidth }, showBezel && WEB_BEZEL]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    backgroundColor: '#2A2826',
    alignItems: 'center',
  },
  frame: {
    flex: 1,
    minHeight: 0,
    backgroundColor: theme.beige,
    overflow: 'hidden',
  },
});
