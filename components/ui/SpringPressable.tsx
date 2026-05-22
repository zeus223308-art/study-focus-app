import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { theme } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = PressableProps & {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

export function SpringPressable({ children, style, onPressIn, onPressOut, ...rest }: Props) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      style={[animStyle, style]}
      onPressIn={(e) => {
        scale.value = withSpring(0.97, theme.spring);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, theme.spring);
        onPressOut?.(e);
      }}>
      {children}
    </AnimatedPressable>
  );
}
