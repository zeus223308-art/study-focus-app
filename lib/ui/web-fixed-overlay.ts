import { Platform, StyleSheet, type ViewStyle } from 'react-native';

/** Pin full-screen overlays/backdrops on iOS Safari mobile web (same as Android Chrome). */
export const webFixedBackdropStyle: ViewStyle =
  Platform.OS === 'web'
    ? ({ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 } as ViewStyle)
    : {};

/** Full-screen modal root — covers visual viewport when Safari URL bar resizes. */
export const webFixedModalRootStyle: ViewStyle =
  Platform.OS === 'web'
    ? ({
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
      } as ViewStyle)
    : {};

/** Hairline dividers are often invisible on iOS Safari — use 1px on mobile web. */
export const webDividerWidth = Platform.OS === 'web' ? 1 : StyleSheet.hairlineWidth;

const modeChipWebStyle: ViewStyle | undefined =
  Platform.OS === 'web'
    ? ({ touchAction: 'manipulation', cursor: 'pointer' } as ViewStyle)
    : undefined;

export { modeChipWebStyle };
