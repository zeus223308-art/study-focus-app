import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { LOGO_WHITE, MountainMLogo, SPLASH_NAVY } from '@/components/MountainMLogo';

type Props = {
  onFinish: () => void;
};

const EASE = Easing.bezier(0.4, 0, 0.2, 1);
const EASE_OUT = Easing.out(Easing.cubic);

const T = {
  mountainIn: 750,
  mountainHold: 500,
  mountainOut: 850,
  brandIn: 650,
  brandHold: 300,
  footerIn: 550,
  footerHold: 500,
  allOut: 600,
};

export function SplashBrand({ onFinish }: Props) {
  const mountainOpacity = useSharedValue(0);
  const mountainScale = useSharedValue(0.88);
  const brandOpacity = useSharedValue(0);
  const brandTranslateY = useSharedValue(10);
  const footerOpacity = useSharedValue(0);
  const footerTranslateY = useSharedValue(14);
  const screenOpacity = useSharedValue(1);

  useEffect(() => {
    const tMountainOut = T.mountainIn + T.mountainHold;
    const tBrandIn = tMountainOut + T.mountainOut;
    const tFooterIn = tBrandIn + T.brandIn + T.brandHold;
    const tAllOut = tFooterIn + T.footerIn + T.footerHold;

    mountainOpacity.value = withSequence(
      withTiming(1, { duration: T.mountainIn, easing: EASE_OUT }),
      withDelay(T.mountainHold, withTiming(0, { duration: T.mountainOut, easing: EASE }))
    );
    mountainScale.value = withSequence(
      withTiming(1, { duration: T.mountainIn, easing: EASE_OUT }),
      withDelay(T.mountainHold, withTiming(1.02, { duration: T.mountainOut, easing: EASE }))
    );

    brandOpacity.value = withDelay(tBrandIn, withTiming(1, { duration: T.brandIn, easing: EASE_OUT }));
    brandTranslateY.value = withDelay(tBrandIn, withTiming(0, { duration: T.brandIn, easing: EASE_OUT }));

    footerOpacity.value = withDelay(tFooterIn, withTiming(1, { duration: T.footerIn, easing: EASE_OUT }));
    footerTranslateY.value = withDelay(tFooterIn, withTiming(0, { duration: T.footerIn, easing: EASE_OUT }));

    screenOpacity.value = withDelay(
      tAllOut,
      withTiming(0, { duration: T.allOut, easing: EASE }, (finished) => {
        if (finished) runOnJS(onFinish)();
      })
    );
  }, [onFinish, mountainOpacity, mountainScale, brandOpacity, brandTranslateY, footerOpacity, footerTranslateY, screenOpacity]);

  const mountainStyle = useAnimatedStyle(() => ({
    opacity: mountainOpacity.value,
    transform: [{ scale: mountainScale.value }],
  }));

  const brandStyle = useAnimatedStyle(() => ({
    opacity: brandOpacity.value,
    transform: [{ translateY: brandTranslateY.value }],
  }));

  const footerStyle = useAnimatedStyle(() => ({
    opacity: footerOpacity.value,
    transform: [{ translateY: footerTranslateY.value }],
  }));

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  return (
    <Animated.View style={[styles.root, screenStyle]}>
      <View style={styles.center}>
        <Animated.View style={[styles.mountainWrap, mountainStyle]}>
          <MountainMLogo width={220} height={154} color={LOGO_WHITE} />
        </Animated.View>

        <Animated.View style={[styles.brandWrap, brandStyle]}>
          <Text style={styles.brand}>Memory Sherpa</Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.footer, footerStyle]}>
        <Text style={styles.brandKo}>메셰</Text>
        <Text style={styles.tagline}>Conquer your memory</Text>
        <Text style={styles.copy}>© MemorySherpa</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: SPLASH_NAVY,
    zIndex: 9999,
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
  brandWrap: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  brand: {
    fontSize: 30,
    fontWeight: '600',
    color: LOGO_WHITE,
    letterSpacing: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 56,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  brandKo: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 10,
  },
  tagline: {
    fontSize: 20,
    fontStyle: 'italic',
    fontWeight: '400',
    color: LOGO_WHITE,
    letterSpacing: 0.4,
    marginBottom: 14,
  },
  copy: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.45)',
  },
});
