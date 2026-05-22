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

export function SplashBrand({ onFinish }: Props) {
  const shimmer = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 500 });
    shimmer.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
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
    opacity: 0.92 + opacity.value * 0.08,
  }));

  const highlightStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value * 0.85,
    transform: [{ translateX: -140 + shimmer.value * 280 }],
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
    width: 76,
    height: 76,
    borderWidth: 2,
    borderColor: theme.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoM: {
    fontSize: 44,
    fontWeight: '300',
    color: '#E5E5E5',
    marginTop: -4,
  },
  brand: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.white,
    letterSpacing: 0.5,
  },
  brandKo: {
    fontSize: 18,
    fontWeight: '600',
    color: '#D4D4D4',
    marginTop: 6,
    marginBottom: 44,
  },
  taglineWrap: {
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tagline: {
    fontSize: 30,
    fontStyle: 'italic',
    color: theme.white,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  shimmerBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  copy: {
    position: 'absolute',
    bottom: 48,
    fontSize: 13,
    fontWeight: '500',
    color: '#A3A3A3',
  },
});
