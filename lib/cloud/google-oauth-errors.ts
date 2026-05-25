/** User-facing hint for common Google OAuth failures (esp. mobile test users). */
export function googleOAuthErrorMessage(raw: unknown, t: (key: string) => string): string {
  const text =
    typeof raw === 'string'
      ? raw
      : raw instanceof Error
        ? raw.message
        : '';

  const lower = text.toLowerCase();

  if (
    lower.includes('access_denied') ||
    lower.includes('access blocked') ||
    lower.includes('authorization error') ||
    lower.includes('403') ||
    lower.includes('400')
  ) {
    return t('settings.cloudOAuthBlocked');
  }

  if (lower.includes('disallowed_useragent') || lower.includes('does not comply')) {
    return t('settings.cloudOAuthDisallowedUseragent');
  }

  if (
    lower.includes('access_type') &&
    lower.includes('offline') &&
    lower.includes('response_type')
  ) {
    return t('settings.cloudOAuthOfflineNotAllowed');
  }

  if (lower.includes('redirect_uri_mismatch') || lower.includes('redirect_uri')) {
    return t('settings.cloudOAuthRedirectMismatch');
  }

  if (text) return text;
  return t('settings.cloudSignInError');
}
