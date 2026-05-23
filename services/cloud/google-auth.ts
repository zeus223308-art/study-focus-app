import { makeRedirectUri } from 'expo-auth-session';

/** Redirect URI to register in Google Cloud Console (Web client). */
export function getGoogleRedirectUri(): string {
  return makeRedirectUri({
    preferLocalhost: true,
  });
}
