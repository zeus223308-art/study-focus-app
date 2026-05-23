import { getEffectiveGoogleClientId } from '@/services/cloud/google-client-store';

export type GoogleTokenRefreshResult = {
  accessToken: string;
  expiresIn: number;
  refreshToken?: string;
};

export async function refreshGoogleAccessToken(
  refreshToken: string
): Promise<GoogleTokenRefreshResult> {
  const clientId = await getEffectiveGoogleClientId();
  if (!clientId) {
    throw new Error('Google client ID not configured');
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as {
    access_token: string;
    expires_in?: number;
    refresh_token?: string;
  };

  return {
    accessToken: json.access_token,
    expiresIn: json.expires_in ?? 3600,
    refreshToken: json.refresh_token,
  };
}
