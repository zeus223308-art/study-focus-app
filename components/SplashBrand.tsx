import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { theme } from '@/constants/theme';

type Props = {
  onFinish: () => void;
};

/** 스케치: 검정 화면 + Conquer your memory 빛이 지나가며 읽힘 */
export function SplashBrand({ onFinish }: Props) {
  const shimmer = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 600 });
    shimmer.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 200 })
        ),
        2,
        false
      )
    );
    const t = setTimeout(onFinish, 3200);
    return () => clearTimeout(t);
  }, [onFinish, opacity, shimmer]);

  const textStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + opacity.value * 0.65,
    transform: [{ scale: 0.98 + shimmer.value * 0.02 }],
  }));

  const highlightStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value * 0.9,
    transform: [{ translateX: -120 + shimmer.value * 240 }],
  }));

  return (
    <View style={styles.root}>
      <View style={styles.logoBox}>
        <Text style={styles.logoM}>M</Text>
      </View>
      <Text style={styles.brand}>MemorySherpa</Text>
      <Text style={styles.brandKo}>메셰</Text>

      <View style={styles.taglineWrap}>
        <Animated.Text style={[styles.tagline, textStyle]}>Conquer your memory</Animated.Text>
        <Animated.View style={[styles.shimmerBar, highlightStyle]} />
      </View>

      <Text style={styles.copy}>© MemorySherpa</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: theme.blackPure,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderWidth: 2,
    borderColor: theme.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoM: {
    fontSize: 40,
    fontWeight: '200',
    color: '#9CA3AF',
    marginTop: -4,
  },
  brand: {
    fontSize: 22,
    fontWeight: '600',
    color: theme.white,
    letterSpacing: 0.5,
  },
  brandKo: {
    fontSize: 15,
    color: theme.grayMuted,
    marginTop: 4,
    marginBottom: 48,
  },
  taglineWrap: {
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagline: {
    fontSize: 26,
    fontStyle: 'italic',
    color: theme.white,
    fontWeight: '300',
    letterSpacing: 0.3,
  },
  shimmerBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  copy: {
    position: 'absolute',
    bottom: 48,
    fontSize: 11,
    color: theme.grayMuted,
  },
});
