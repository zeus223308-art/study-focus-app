import { Platform, type ViewStyle } from 'react-native';

/** Pin full-screen overlays/backdrops on iOS Safari mobile web (same as Android Chrome). */
export const webFixedBackdropStyle: ViewStyle =
  Platform.OS === 'web'
    ? ({ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 } as ViewStyle)
    : {};
