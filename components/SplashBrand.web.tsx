import { useEffect, useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LOGO_WHITE, SPLASH_BLACK } from '@/components/MountainMLogo';
import { theme } from '@/constants/theme';
import { isLegacyMobileSafari } from '@/lib/ui/legacy-mobile-safari';

const mountainLogo = require('@/assets/images/mountain-m-logo.png');
const legacyWeb = isLegacyMobileSafari();

type Props = {
  onFinish: () => void;
};

const T = {
  mountainIn: 750,
  mountainHold: 500,
  mountainOut: 850,
  taglineIn: 650,
  taglineHold: 800,
  allOut: 600,
};

/** Web splash — match native sequence; skip Reanimated on iOS 15 Safari. */
export function SplashBrand({ onFinish }: Props) {
  const insets = useSafeAreaInsets();
  const [mountainOpacity, setMountainOpacity] = useState(legacyWeb ? 0 : 1);
  const [taglineOpacity, setTaglineOpacity] = useState(0);
  const [footerOpacity, setFooterOpacity] = useState(0);
  const [screenOpacity, setScreenOpacity] = useState(1);

  useEffect(() => {
    void SplashScreen.hideAsync();

    if (legacyWeb) {
      const t = setTimeout(onFinish, 400);
      return () => clearTimeout(t);
    }

    const tMountainOut = T.mountainIn + T.mountainHold;
    const tTaglineIn = tMountainOut + T.mountainOut;
    const tAllOut = tTaglineIn + T.taglineIn + T.taglineHold;

    const timers = [
      setTimeout(() => setMountainOpacity(0), tMountainOut),
      setTimeout(() => {
        setTaglineOpacity(1);
        setFooterOpacity(1);
      }, tTaglineIn),
      setTimeout(() => setScreenOpacity(0), tAllOut),
      setTimeout(onFinish, tAllOut + T.allOut),
    ];

    return () => timers.forEach(clearTimeout);
  }, [onFinish]);

  if (legacyWeb) {
    return (
      <View style={[styles.root, styles.legacyRoot]} pointerEvents="none">
        <Text style={styles.legacyTitle}>MemorySherpa</Text>
        <Text style={styles.legacyTagline}>Conquer your memory</Text>
      </View>
    );
  }

  const fadeMs = Platform.OS === 'web' ? T.mountainOut : 0;

  return (
    <View style={[styles.root, { opacity: screenOpacity }]} pointerEvents="none">
      <View style={styles.center}>
        <View style={[styles.mountainWrap, { opacity: mountainOpacity, transition: `opacity ${fadeMs}ms ease` } as object]}>
          <Image
            source={mountainLogo}
            style={styles.mountainLogo}
            resizeMode="contain"
            accessibilityLabel="MemorySherpa logo"
          />
        </View>

        <View style={[styles.taglineWrap, { opacity: taglineOpacity, transition: `opacity ${T.taglineIn}ms ease` } as object]}>
          <Text style={styles.tagline}>Conquer your memory</Text>
        </View>
      </View>

      <View
        style={[
          styles.footer,
          { bottom: Math.max(insets.bottom, 24) + 32, opacity: footerOpacity, transition: `opacity ${T.taglineIn}ms ease` } as object,
        ]}>
        <Text style={styles.copy}>© MemorySherpa</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: SPLASH_BLACK,
    zIndex: 9999,
    elevation: 9999,
  },
  legacyRoot: {
    backgroundColor: theme.beige,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  legacyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.black,
    marginBottom: 12,
  },
  legacyTagline: {
    fontSize: 20,
    fontStyle: 'italic',
    fontWeight: '400',
    color: theme.gray,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mountainWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mountainLogo: {
    width: 240,
    height: 168,
  },
  taglineWrap: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  tagline: {
    fontSize: 22,
    fontStyle: 'italic',
    fontWeight: '400',
    color: LOGO_WHITE,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  copy: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.45)',
  },
});
