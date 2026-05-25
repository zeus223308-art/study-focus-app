import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { getGoogleRedirectUri } from '@/services/cloud/google-auth';
import {
  getGoogleOAuthClientIds,
  isGoogleClientIdConfigured,
} from '@/services/cloud/google-client-store';
import { isNativeGoogleClientConfigured } from '@/services/cloud/google-config';
import { GOOGLE_DRIVE_SCOPES, type GoogleDriveSession } from '@/services/cloud/google-config';
import { buildSessionFromToken } from '@/services/cloud/google-drive-api';
import {
  clearGoogleDriveSession,
  ensureGoogleDriveSession,
  hasStoredGoogleRefreshToken,
  saveGoogleDriveSession,
} from '@/services/cloud/google-session';

WebBrowser.maybeCompleteAuthSession({ skipRedirectCheck: true });

async function sessionFromAuthResult(
  accessToken: string,
  expiresIn?: number | null,
  refreshToken?: string | null
): Promise<GoogleDriveSession> {
  const next = await buildSessionFromToken(accessToken, expiresIn ?? 3600, {
    refreshToken: refreshToken ?? undefined,
  });
  await saveGoogleDriveSession(next);
  return next;
}

export function useGoogleDriveAuth() {
  const [session, setSession] = useState<GoogleDriveSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientIds, setClientIds] = useState({ web: '', ios: '', android: '' });
  const redirectUri = getGoogleRedirectUri();

  const reloadClientId = useCallback(async () => {
    const ids = await getGoogleOAuthClientIds();
    setClientIds(ids);
    return ids.web;
  }, []);

  const configured = isGoogleClientIdConfigured(clientIds.web);
  const nativeOAuthReady = useMemo(() => {
    if (Platform.OS === 'web') return true;
    if (Platform.OS === 'ios') {
      return isNativeGoogleClientConfigured('ios') || isGoogleClientIdConfigured(clientIds.web);
    }
    return isNativeGoogleClientConfigured('android') || isGoogleClientIdConfigured(clientIds.web);
  }, [clientIds.web]);

  const [forceConsent, setForceConsent] = useState(false);

  /** Web uses token/id_token implicit flow — access_type=offline is invalid (Google 400). */
  const oauthExtra = useMemo((): Record<string, string> => {
    if (Platform.OS === 'web') {
      return forceConsent ? { prompt: 'consent' } : {};
    }
    return forceConsent
      ? { access_type: 'offline', prompt: 'consent' }
      : { access_type: 'offline' };
  }, [forceConsent]);

  const iosClientId =
    Platform.OS === 'ios' && isGoogleClientIdConfigured(clientIds.ios) ? clientIds.ios : undefined;
  const androidClientId =
    Platform.OS === 'android' && isGoogleClientIdConfigured(clientIds.android)
      ? clientIds.android
      : undefined;

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: configured ? clientIds.web : 'unset.apps.googleusercontent.com',
    iosClientId,
    androidClientId,
    scopes: GOOGLE_DRIVE_SCOPES,
    redirectUri,
    extraParams: oauthExtra,
  });

  const reloadSession = useCallback(async () => {
    const existing = await ensureGoogleDriveSession();
    setSession(existing);
    return existing;
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      await reloadClientId();
      const hasRefresh = await hasStoredGoogleRefreshToken();
      if (!hasRefresh) setForceConsent(true);
      const existing = await ensureGoogleDriveSession();
      if (active) setSession(existing);
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [reloadClientId]);

  useEffect(() => {
    if (response?.type !== 'success') return;
    const accessToken = response.authentication?.accessToken;
    if (!accessToken) return;

    void sessionFromAuthResult(
      accessToken,
      response.authentication?.expiresIn,
      response.authentication?.refreshToken
    ).then(setSession);
  }, [response]);

  const signIn = useCallback(async (): Promise<GoogleDriveSession | null> => {
    if (!configured) {
      throw new Error('Google Drive is not configured');
    }
    if (await hasStoredGoogleRefreshToken()) {
      const restored = await ensureGoogleDriveSession();
      if (restored) {
        setSession(restored);
        return restored;
      }
    }
    // Mobile browsers often block OAuth popups; full-page redirect works on web.
    const result = await promptAsync(
      Platform.OS === 'web' ? { windowName: '_self' } : undefined
    );
    if (result?.type === 'error') {
      const params = result.params as Record<string, string> | undefined;
      throw new Error(params?.error_description ?? params?.error ?? 'Google sign-in failed');
    }
    if (result?.type !== 'success') return null;
    const accessToken = result.authentication?.accessToken;
    if (!accessToken) return null;
    const next = await sessionFromAuthResult(
      accessToken,
      result.authentication?.expiresIn,
      result.authentication?.refreshToken
    );
    setSession(next);
    return next;
  }, [configured, promptAsync]);

  const signOut = useCallback(async () => {
    await clearGoogleDriveSession();
    setSession(null);
  }, []);

  return {
    configured,
    webClientId: clientIds.web,
    clientIds,
    nativeOAuthReady,
    reloadClientId,
    reloadSession,
    redirectUri,
    session,
    loading,
    signIn,
    signOut,
    requestReady: configured && !!request,
  };
}
