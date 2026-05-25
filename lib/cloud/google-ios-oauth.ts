import { isValidGoogleClientId } from '@/services/cloud/google-config';

export const GOOGLE_IOS_BUNDLE_ID = 'com.memorysherpa.app';

/** iOS OAuth client → URL scheme Google expects (Info.plist CFBundleURLSchemes). */
export function googleIosReversedClientScheme(clientId: string): string | null {
  if (!isValidGoogleClientId(clientId)) return null;
  const prefix = clientId.replace(/\.apps\.googleusercontent\.com$/i, '');
  if (!prefix || prefix === clientId) return null;
  return `com.googleusercontent.apps.${prefix}`;
}
