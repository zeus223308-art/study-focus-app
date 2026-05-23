import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';

import { getGoogleRedirectUri } from '@/services/cloud/google-auth';
import {
  getEffectiveGoogleClientId,
  isGoogleClientIdConfigured,
} from '@/services/cloud/google-client-store';
import { GOOGLE_DRIVE_SCOPES, type GoogleDriveSession } from '@/services/cloud/google-config';
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
  const [webClientId, setWebClientId] = useState('');
  const redirectUri = getGoogleRedirectUri();

  const reloadClientId = useCallback(async () => {
    const id = await getEffectiveGoogleClientId();
    setWebClientId(id);
    return id;
  }, []);

  const configured = isGoogleClientIdConfigured(webClientId);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: configured ? webClientId : 'unset.apps.googleusercontent.com',
    scopes: GOOGLE_DRIVE_SCOPES,
    redirectUri,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      await reloadClientId();
      const existing = await loadGoogleDriveSession();
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

    void sessionFromAuthResult(accessToken, response.authentication?.expiresIn).then(setSession);
  }, [response]);

  const signIn = useCallback(async (): Promise<GoogleDriveSession | null> => {
    if (!configured) {
      throw new Error('Google Drive is not configured');
    }
    const result = await promptAsync();
    if (result?.type !== 'success') return null;
    const accessToken = result.authentication?.accessToken;
    if (!accessToken) return null;
    const next = await sessionFromAuthResult(accessToken, result.authentication?.expiresIn);
    setSession(next);
    return next;
  }, [configured, promptAsync]);

  const signOut = useCallback(async () => {
    await clearGoogleDriveSession();
    setSession(null);
  }, []);

  return {
    configured,
    webClientId,
    reloadClientId,
    redirectUri,
    session,
    loading,
    signIn,
    signOut,
    requestReady: configured && !!request,
  };
}
