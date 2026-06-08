import { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

import { LOGO_WHITE, SPLASH_BLACK } from '@/components/MountainMLogo';
import { isLegacyMobileSafari } from '@/lib/ui/legacy-mobile-safari';

const mountainLogo = require('@/assets/images/mountain-m-logo.png');

type Props = {
  onFinish: () => void;
};

/** Web splash — avoid Reanimated worklets on iOS 15 Safari (iPhone 7). */
export function SplashBrand({ onFinish }: Props) {
  useEffect(() => {
    void SplashScreen.hideAsync();
    const ms = isLegacyMobileSafari() ? 900 : 1400;
    const t = setTimeout(onFinish, ms);
    return () => clearTimeout(t);
  }, [onFinish]);

  return (
    <View style={styles.root} pointerEvents="none">
      <Image
        source={mountainLogo}
        style={styles.mountainLogo}
        resizeMode="contain"
        accessibilityLabel="MemorySherpa logo"
      />
      <Text style={styles.tagline}>Conquer your memory</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: SPLASH_BLACK,
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  mountainLogo: {
    width: 200,
    height: 140,
  },
  tagline: {
    fontSize: 20,
    fontStyle: 'italic',
    fontWeight: '400',
    color: LOGO_WHITE,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});
