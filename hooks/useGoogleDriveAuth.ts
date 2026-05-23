import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';

import { getGoogleRedirectUri } from '@/services/cloud/google-auth';
import {
  GOOGLE_DRIVE_SCOPES,
  GOOGLE_WEB_CLIENT_ID,
  isGoogleDriveConfigured,
  type GoogleDriveSession,
} from '@/services/cloud/google-config';
import { buildSessionFromToken } from '@/services/cloud/google-drive-api';
import {
  clearGoogleDriveSession,
  loadGoogleDriveSession,
  saveGoogleDriveSession,
} from '@/services/cloud/google-session';

WebBrowser.maybeCompleteAuthSession();

async function sessionFromAuthResult(
  accessToken: string,
  expiresIn?: number | null
): Promise<GoogleDriveSession> {
  const next = await buildSessionFromToken(accessToken, expiresIn ?? 3600);
  await saveGoogleDriveSession(next);
  return next;
}

export function useGoogleDriveAuth() {
  const [session, setSession] = useState<GoogleDriveSession | null>(null);
  const [loading, setLoading] = useState(true);
  const redirectUri = getGoogleRedirectUri();

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    scopes: GOOGLE_DRIVE_SCOPES,
    redirectUri,
  });

  useEffect(() => {
    loadGoogleDriveSession()
      .then(setSession)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (response?.type !== 'success') return;
    const accessToken = response.authentication?.accessToken;
    if (!accessToken) return;

    void sessionFromAuthResult(accessToken, response.authentication?.expiresIn).then(setSession);
  }, [response]);

  const signIn = useCallback(async (): Promise<GoogleDriveSession | null> => {
    if (!isGoogleDriveConfigured()) {
      throw new Error('Google Drive is not configured');
    }
    const result = await promptAsync();
    if (result?.type !== 'success') return null;
    const accessToken = result.authentication?.accessToken;
    if (!accessToken) return null;
    const next = await sessionFromAuthResult(accessToken, result.authentication?.expiresIn);
    setSession(next);
    return next;
  }, [promptAsync]);

  const signOut = useCallback(async () => {
    await clearGoogleDriveSession();
    setSession(null);
  }, []);

  return {
    configured: isGoogleDriveConfigured(),
    redirectUri,
    session,
    loading,
    signIn,
    signOut,
    requestReady: !!request,
  };
}
