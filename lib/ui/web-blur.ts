import { Platform, type ImageStyle } from 'react-native';

/** Blur preview images on mobile web (iOS Safari needs -webkit-filter). */
export const webPreviewBlurStyle: ImageStyle =
  Platform.OS === 'web'
    ? ({ filter: 'blur(6px)', WebkitFilter: 'blur(6px)' } as ImageStyle)
    : {};
