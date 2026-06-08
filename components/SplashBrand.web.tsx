import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LOGO_WHITE, SPLASH_BLACK } from '@/components/MountainMLogo';
import { theme } from '@/constants/theme';
import { dismissWebBootOverlay } from '@/lib/ui/dismiss-web-boot';
import { isLegacyMobileSafari } from '@/lib/ui/legacy-mobile-safari';

const mountainLogo = require('@/assets/images/mountain-m-logo.png');
const legacyWeb = isLegacyMobileSafari();

type Props = {
  onFinish: () => void;
};

type SplashPhase = 'logo' | 'tagline' | 'out';

const T = {
  mountainIn: 750,
  mountainHold: 500,
  mountainOut: 850,
  taglineIn: 650,
  taglineHold: 800,
  allOut: 600,
};

function markSplashMounted() {
  if (typeof window === 'undefined') return;
  (window as unknown as { __MS_SPLASH_MOUNTED?: boolean }).__MS_SPLASH_MOUNTED = true;
  dismissWebBootOverlay();
}

/** Web splash — match native sequence; skip Reanimated on iOS 15 Safari. */
export function SplashBrand({ onFinish }: Props) {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<SplashPhase>(legacyWeb ? 'out' : 'logo');

  useEffect(() => {
    markSplashMounted();
    void SplashScreen.hideAsync();

    if (legacyWeb) {
      const t = setTimeout(onFinish, 400);
      return () => clearTimeout(t);
    }

    const tTagline = T.mountainIn + T.mountainHold + T.mountainOut;
    const tOut = tTagline + T.taglineIn + T.taglineHold;

    const timers = [
      setTimeout(() => setPhase('tagline'), tTagline),
      setTimeout(() => setPhase('out'), tOut),
      setTimeout(onFinish, tOut + T.allOut),
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

  return (
    <View style={[styles.root, phase === 'out' && styles.rootOut]} pointerEvents="none">
      <View style={styles.center}>
        {phase === 'logo' ? (
          <Image
            source={mountainLogo}
            style={styles.mountainLogo}
            resizeMode="contain"
            accessibilityLabel="MemorySherpa logo"
          />
        ) : null}

        {phase === 'tagline' ? (
          <Text style={styles.tagline}>Conquer your memory</Text>
        ) : null}
      </View>

      {phase === 'tagline' ? (
        <View style={[styles.footer, { bottom: Math.max(insets.bottom, 24) + 32 }]}>
          <Text style={styles.copy}>© MemorySherpa</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: SPLASH_BLACK,
    zIndex: 9999,
    elevation: 9999,
    opacity: 1,
  },
  rootOut: {
    opacity: 0,
    transition: 'opacity 600ms ease',
  } as object,
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
    paddingHorizontal: 24,
  },
  mountainLogo: {
    width: 240,
    height: 168,
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
