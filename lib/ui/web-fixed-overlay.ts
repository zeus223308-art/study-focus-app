import { Platform, type GestureResponderEvent, type ViewStyle } from 'react-native';

/** Prevent sheet inner taps from bubbling to the backdrop dismiss handler (iOS Safari). */
export function stopSheetPress(e: GestureResponderEvent) {
  e.stopPropagation();
}

/** Pin full-screen overlays/backdrops on iOS Safari mobile web (same as Android Chrome). */
export const webFixedBackdropStyle: ViewStyle =
  Platform.OS === 'web'
    ? ({ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 } as ViewStyle)
    : {};

/** Modal / sheet backdrop: flex fill + fixed viewport on mobile web. */
export const webModalBackdropStyle: ViewStyle = {
  flex: 1,
  ...webFixedBackdropStyle,
};
