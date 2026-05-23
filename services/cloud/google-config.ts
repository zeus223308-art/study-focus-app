/** Canonical values to register in Google Cloud Console (Web OAuth client). */
export const GOOGLE_OAUTH_JS_ORIGINS = [
  'https://zeus223308-art.github.io',
  'http://localhost:8081',
  'http://localhost:4173',
] as const;

export const GOOGLE_OAUTH_REDIRECT_URIS = [
  'https://zeus223308-art.github.io/study-focus-app',
  'https://zeus223308-art.github.io/study-focus-app/',
  'http://localhost:8081',
  'http://localhost:4173',
  'http://localhost:4173/study-focus-app',
  'http://localhost:4173/study-focus-app/',
] as const;

export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

export const DRIVE_APPDATA_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

export const GOOGLE_DRIVE_SCOPES = [
  DRIVE_APPDATA_SCOPE,
  'openid',
  'profile',
  'email',
];

export const DRIVE_BACKUP_FILENAME = 'memorysherpa-backup-v1.json';

export const GOOGLE_TOKEN_STORAGE_KEY = '@memory_sherpa_google_drive';

export function isValidGoogleClientId(clientId: string): boolean {
  return clientId.includes('.apps.googleusercontent.com') && clientId.length > 20;
}

export function isGoogleDriveConfigured(): boolean {
  return isValidGoogleClientId(GOOGLE_WEB_CLIENT_ID);
}

export type GoogleDriveSession = {
  accessToken: string;
  expiresAt: number;
  email: string | null;
};
