import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

/** Redirect URI to register in Google Cloud Console (Web client). */
export function getGoogleRedirectUri(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const basePath = (process.env.EXPO_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '');
    if (basePath) {
      return stripTrailingSlash(`${window.location.origin}${basePath}`);
    }

    // Local dev at root, or infer repo subpath from current URL.
    const pathDir = window.location.pathname.replace(/\/[^/]*$/, '');
    if (pathDir && pathDir !== '/') {
      return stripTrailingSlash(`${window.location.origin}${pathDir}`);
    }

    return stripTrailingSlash(window.location.origin);
  }

  return makeRedirectUri({ preferLocalhost: true });
}
