import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

type Props = PressableProps & {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/** Web — skip Reanimated worklets (iOS 15 Safari / iPhone 7). */
export function SpringPressable({ children, style, ...rest }: Props) {
  return (
    <Pressable {...rest} style={style}>
      {children}
    </Pressable>
  );
}
