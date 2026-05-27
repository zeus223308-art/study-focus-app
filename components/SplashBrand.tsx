import { getLocales } from 'expo-localization';
import { useCallback, useEffect, useMemo } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { LOGO_WHITE, SPLASH_BLACK } from '@/components/MountainMLogo';
import en from '@/i18n/locales/en.json';
import ko from '@/i18n/locales/ko.json';

const mountainLogo = require('@/assets/images/mountain-m-logo.png');

type Props = {
  onFinish: () => void;
};

const EASE = Easing.bezier(0.4, 0, 0.2, 1);
const EASE_OUT = Easing.out(Easing.cubic);

const T = {
  mountainIn: 750,
  mountainHold: 500,
  mountainOut: 850,
  taglineIn: 650,
  taglineHold: 800,
  allOut: 600,
};

function splashTagline(): string {
  const code = getLocales()[0]?.languageCode ?? 'ko';
  return code === 'ko' ? ko.splashTagline : en.splashTagline;
}

export function SplashBrand({ onFinish }: Props) {
  const insets = useSafeAreaInsets();
  const tagline = useMemo(() => splashTagline(), []);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      SplashScreen.setOptions({ duration: 280, fade: true });
    }
  }, []);

  const hideNativeSplash = useCallback(() => {
    void SplashScreen.hideAsync();
  }, []);

  const mountainOpacity = useSharedValue(1);
  const mountainScale = useSharedValue(0.94);
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(14);
  const footerOpacity = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  useEffect(() => {
    const tMountainOut = T.mountainIn + T.mountainHold;
    const tTaglineIn = tMountainOut + T.mountainOut;
    const tAllOut = tTaglineIn + T.taglineIn + T.taglineHold;

    mountainOpacity.value = withSequence(
      withTiming(1, { duration: T.mountainIn, easing: EASE_OUT }),
      withDelay(T.mountainHold, withTiming(0, { duration: T.mountainOut, easing: EASE }))
    );
    mountainScale.value = withSequence(
      withTiming(1, { duration: T.mountainIn, easing: EASE_OUT }),
      withDelay(T.mountainHold, withTiming(1.02, { duration: T.mountainOut, easing: EASE }))
    );

    taglineOpacity.value = withDelay(tTaglineIn, withTiming(1, { duration: T.taglineIn, easing: EASE_OUT }));
    taglineTranslateY.value = withDelay(tTaglineIn, withTiming(0, { duration: T.taglineIn, easing: EASE_OUT }));

    footerOpacity.value = withDelay(tTaglineIn, withTiming(1, { duration: T.taglineIn, easing: EASE_OUT }));

    screenOpacity.value = withDelay(
      tAllOut,
      withTiming(0, { duration: T.allOut, easing: EASE }, (finished) => {
        if (finished) runOnJS(onFinish)();
      })
    );
  }, [onFinish, mountainOpacity, mountainScale, taglineOpacity, taglineTranslateY, footerOpacity, screenOpacity]);

  const mountainStyle = useAnimatedStyle(() => ({
    opacity: mountainOpacity.value,
    transform: [{ scale: mountainScale.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslateY.value }],
  }));

  const footerStyle = useAnimatedStyle(() => ({
    opacity: footerOpacity.value,
  }));

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  return (
    <Animated.View style={[styles.root, screenStyle]} pointerEvents="auto">
      <View style={styles.center}>
        <Animated.View style={[styles.mountainWrap, mountainStyle]}>
          <Image
            source={mountainLogo}
            style={styles.mountainLogo}
            resizeMode="contain"
            accessibilityLabel="MemorySherpa logo"
            onLayout={hideNativeSplash}
          />
        </Animated.View>

        <Animated.View style={[styles.taglineWrap, taglineStyle]}>
          <Text style={styles.tagline}>{tagline}</Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.footer, { bottom: Math.max(insets.bottom, 24) + 32 }, footerStyle]}>
        <Text style={styles.copy}>© MemorySherpa</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: SPLASH_BLACK,
    zIndex: 9999,
    elevation: 9999,
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
