import { useCallback, useRef } from 'react';
import {
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

const DEFAULT_DEBOUNCE_MS = 180;

/** RN Web pressable baseline — same tap feel on Android Chrome and iOS Safari. */
export const WEB_PRESSABLE_STYLE: ViewStyle =
  Platform.OS === 'web'
    ? ({
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        cursor: 'pointer',
      } as ViewStyle)
    : {};

type Props = PressableProps & {
  style?: StyleProp<ViewStyle>;
  /** Ignore repeat presses within this window (default 180ms). */
  debounceMs?: number;
};

/**
 * Pressable with mobile-web touch CSS and light debounce.
 * Use inside ScrollView instead of raw HTML &lt;button&gt;.
 */
export function WebPressable({
  onPress,
  disabled,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  style,
  delayLongPress = 0,
  pressRetentionOffset = 12,
  ...rest
}: Props) {
  const lastPressRef = useRef(0);

  const handlePress = useCallback(
    (event: Parameters<NonNullable<PressableProps['onPress']>>[0]) => {
      if (disabled || !onPress) return;
      const now = Date.now();
      if (now - lastPressRef.current < debounceMs) return;
      lastPressRef.current = now;
      onPress(event);
    },
    [debounceMs, disabled, onPress]
  );

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      delayLongPress={delayLongPress}
      pressRetentionOffset={pressRetentionOffset}
      onPress={handlePress}
      style={(state) => {
        const base =
          typeof style === 'function'
            ? style(state)
            : style;
        return Platform.OS === 'web'
          ? [WEB_PRESSABLE_STYLE, base, disabled && { opacity: 0.35 }]
          : [base, disabled && { opacity: 0.35 }];
      }}
    />
  );
}
