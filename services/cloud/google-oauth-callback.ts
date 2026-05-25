import { TokenResponse } from 'expo-auth-session';
import { Platform } from 'react-native';

import { buildSessionFromToken } from '@/services/cloud/google-drive-api';
import { saveGoogleDriveSession } from '@/services/cloud/google-session';

export type GoogleOAuthCallbackResult =
  | { type: 'success'; email: string | null }
  | { type: 'error'; message: string };

function parseOAuthParams(href: string): Record<string, string> {
  const url = new URL(href);
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  if (url.hash) {
    new URLSearchParams(url.hash.replace(/^#/, '')).forEach((value, key) => {
      params[key] = value;
    });
  }
  return params;
}

export function cleanGoogleOAuthUrl(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const { pathname, search, origin } = window.location;
  if (!window.location.hash && !search.includes('access_token') && !search.includes('error=')) {
    return;
  }
  window.history.replaceState({}, document.title, `${origin}${pathname}${search}`);
}

export function hasGoogleOAuthCallbackInUrl(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const params = parseOAuthParams(window.location.href);
  return Boolean(params.access_token || params.error);
}

/** Full-page OAuth redirect — parse hash, save session, strip URL. */
const OAUTH_HANDLED_KEY = 'memorysherpa_google_oauth_handled';

export async function consumeGoogleOAuthCallbackFromUrl(): Promise<GoogleOAuthCallbackResult | null> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;

  const params = parseOAuthParams(window.location.href);
  if (!params.access_token && !params.error) {
    if (params.state) cleanGoogleOAuthUrl();
    return null;
  }

  if (params.error) {
    const message = params.error_description ?? params.error;
    cleanGoogleOAuthUrl();
    return { type: 'error', message };
  }

  const tokenResponse = TokenResponse.fromQueryParams(params);
  const accessToken = tokenResponse.accessToken;
  if (!accessToken) {
    cleanGoogleOAuthUrl();
    return { type: 'error', message: 'Missing access token' };
  }

  if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(OAUTH_HANDLED_KEY)) {
    cleanGoogleOAuthUrl();
    return { type: 'success', email: null };
  }

  const session = await buildSessionFromToken(accessToken, tokenResponse.expiresIn ?? 3600, {
    refreshToken: tokenResponse.refreshToken,
  });
  await saveGoogleDriveSession(session);
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(OAUTH_HANDLED_KEY, '1');
  }
  cleanGoogleOAuthUrl();

  return { type: 'success', email: session.email };
}
