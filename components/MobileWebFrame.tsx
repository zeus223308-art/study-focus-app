import { ReactNode, useMemo } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';

import { theme } from '@/constants/theme';
import { getDeviceClass } from '@/lib/ui/viewport-layout';
import { useLayoutViewportSize } from '@/lib/ui/mobile-web-viewport';

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

  const { width: windowWidth, height: windowHeight } = useLayoutViewportSize();
  const deviceClass = getDeviceClass(windowWidth, windowHeight);
  const isLandscape = windowWidth > windowHeight;
  const isPhone = deviceClass === 'phone';
  /** Real mobile browsers: use full viewport width (no desktop phone-frame crop). */
  const mobileWebFullBleed = isPhone;
  const phoneLandscapeFullBleed = isLandscape && isPhone;
  const useFullBleed = mobileWebFullBleed || phoneLandscapeFullBleed;
  const frameWidth = useFullBleed
    ? windowWidth
    : isLandscape
      ? Math.min(
          deviceClass === 'largeTablet' ? 1200 : deviceClass === 'tablet' ? 960 : windowWidth,
          windowWidth - 24
        )
      : deviceClass === 'largeTablet'
        ? Math.min(1100, windowWidth - 48)
        : deviceClass === 'tablet'
          ? Math.min(820, windowWidth - 48)
          : Math.min(MOBILE_FRAME_WIDTH, windowWidth);
  const showBezel = !useFullBleed && windowWidth > frameWidth + 48;

  return (
    <View style={[styles.shell, useFullBleed && styles.shellFullBleed]}>
      <View
        style={[
          styles.frame,
          useFullBleed ? styles.frameFullBleed : { width: frameWidth },
          showBezel && WEB_BEZEL,
        ]}>
        {children}
      </View>
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
  shellFullBleed: {
    alignItems: 'stretch',
  },
  frame: {
    flex: 1,
    minHeight: 0,
    backgroundColor: theme.beige,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({ overflowX: 'clip' } as object) : null),
  },
  frameFullBleed: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    overflowX: 'clip' as const,
  },
});
