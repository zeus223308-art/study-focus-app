import { useCallback, useEffect } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { LOGO_WHITE, SPLASH_BLACK } from '@/components/MountainMLogo';

const mountainLogo = require('@/assets/images/mountain-m-logo.png');

const M_SHINE_PATH = `
  M 54 98
  L 70 64
  L 84 30
  L 102 58
  L 120 86
  L 138 58
  L 156 30
  L 170 64
  L 186 98
`;
const SHINE_PATH_LENGTH = 338;
const SHINE_SEGMENT_LENGTH = 46;
const SHINE_GAP = 1200;
const AnimatedPath = Animated.createAnimatedComponent(Path);

type Props = {
  onFinish: () => void;
};

const EASE = Easing.bezier(0.4, 0, 0.2, 1);
const EASE_OUT = Easing.out(Easing.cubic);

const T = {
  mountainIn: 260,
  shineSweep: 980,
  mountainOut: 280,
  taglineIn: 280,
  taglineHold: 180,
  allOut: 240,
};

export function SplashBrand({ onFinish }: Props) {
  const insets = useSafeAreaInsets();
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
  const shineProgress = useSharedValue(0);

  useEffect(() => {
    const tMountainOut = T.mountainIn + T.shineSweep;
    const tTaglineIn = tMountainOut + T.mountainOut;
    const tAllOut = tTaglineIn + T.taglineIn + T.taglineHold;

    mountainOpacity.value = withSequence(withTiming(1, { duration: T.mountainIn, easing: EASE_OUT }), withDelay(T.shineSweep, withTiming(0, { duration: T.mountainOut, easing: EASE })));
    mountainScale.value = withSequence(
      withTiming(1, { duration: T.mountainIn, easing: EASE_OUT }),
      withDelay(T.shineSweep, withTiming(1.01, { duration: T.mountainOut, easing: EASE }))
    );
    shineProgress.value = withDelay(80, withTiming(1, { duration: T.shineSweep, easing: Easing.linear }));

    taglineOpacity.value = withDelay(tTaglineIn, withTiming(1, { duration: T.taglineIn, easing: EASE_OUT }));
    taglineTranslateY.value = withDelay(tTaglineIn, withTiming(0, { duration: T.taglineIn, easing: EASE_OUT }));

    footerOpacity.value = withDelay(tTaglineIn, withTiming(1, { duration: T.taglineIn, easing: EASE_OUT }));

    screenOpacity.value = withDelay(
      tAllOut,
      withTiming(0, { duration: T.allOut, easing: EASE }, (finished) => {
        if (finished) runOnJS(onFinish)();
      })
    );
  }, [onFinish, mountainOpacity, mountainScale, taglineOpacity, taglineTranslateY, footerOpacity, screenOpacity, shineProgress]);

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

  const shineAnimatedProps = useAnimatedProps(() => {
    const p = Math.max(0, Math.min(1, shineProgress.value));
    return {
      strokeDashoffset:
        SHINE_PATH_LENGTH - p * (SHINE_PATH_LENGTH + SHINE_SEGMENT_LENGTH),
      opacity: p <= 0.02 || p >= 0.98 ? 0 : 1,
    };
  });

  return (
    <Animated.View style={[styles.root, screenStyle]} pointerEvents="auto">
      <View style={styles.center}>
        <Animated.View style={[styles.mountainWrap, mountainStyle]}>
          <View style={styles.logoBox} onLayout={hideNativeSplash}>
            <Image
              source={mountainLogo}
              style={styles.mountainLogo}
              resizeMode="contain"
              accessibilityLabel="MemorySherpa logo"
            />
            <MShineOverlay shineAnimatedProps={shineAnimatedProps} />
          </View>
        </Animated.View>

        <Animated.View style={[styles.taglineWrap, taglineStyle]}>
          <Text style={styles.tagline}>Conquer your memory</Text>
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
  logoBox: {
    width: 240,
    height: 168,
  },
  mountainLogo: {
    width: 240,
    height: 168,
  },
  shineOverlay: {
    ...StyleSheet.absoluteFill,
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

function MShineOverlay({ shineAnimatedProps }: { shineAnimatedProps: any }) {
  return (
    <View style={styles.shineOverlay} pointerEvents="none">
      <Svg width={240} height={168} viewBox="0 0 240 168">
        <AnimatedPath
          d={M_SHINE_PATH}
          stroke={LOGO_WHITE}
          strokeWidth={2.3}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={`${SHINE_SEGMENT_LENGTH} ${SHINE_GAP}`}
          animatedProps={shineAnimatedProps}
        />
      </Svg>
    </View>
  );
}
