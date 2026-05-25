import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useApp } from '@/context/AppContext';
import { googleOAuthErrorMessage } from '@/lib/cloud/google-oauth-errors';
import { showMessage } from '@/lib/ui/confirm';
import { consumeGoogleOAuthCallbackFromUrl } from '@/services/cloud/google-oauth-callback';
import { useTranslation } from 'react-i18next';

/** Handles Google OAuth full-page redirect on web (hash in URL → session → Settings). */
export function GoogleOAuthReturnHandler() {
  const { t } = useTranslation();
  const router = useRouter();
  const { reloadAccountData, updateSettings } = useApp();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    void (async () => {
      const result = await consumeGoogleOAuthCallbackFromUrl();
      if (!result) return;
      handledRef.current = true;
      if (result.type === 'success') {
        await reloadAccountData();
        updateSettings({ cloudBackupEnabled: true });
        showMessage(t('settings.cloud'), t('settings.cloudWebLoginSuccess'));
        router.replace('/(tabs)/settings');
        return;
      }
      showMessage(t('settings.cloud'), googleOAuthErrorMessage(result.message, t));
      router.replace('/(tabs)/settings');
    })();
  }, [reloadAccountData, router, t, updateSettings]);

  return null;
}
