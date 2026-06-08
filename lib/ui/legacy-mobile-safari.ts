import { Platform } from 'react-native';

/** iPhone 7 era — iOS 15.x Safari on web (Expo static export). */
export function isLegacyMobileSafari(): boolean {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (!/iPhone|iPad|iPod/i.test(ua)) return false;
  const match = ua.match(/OS (\d+)[._]/);
  const major = match ? Number.parseInt(match[1], 10) : 99;
  return major > 0 && major <= 15;
}
