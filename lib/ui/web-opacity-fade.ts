import type { ViewStyle } from 'react-native';

/** CSS opacity transition for RN Web (avoid Reanimated on iOS 15 Safari). */
export function webOpacityFade(opacity: number, durationMs: number): ViewStyle {
  return {
    opacity,
    transitionProperty: 'opacity',
    transitionDuration: `${durationMs}ms`,
    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
    willChange: 'opacity',
  } as ViewStyle;
}
