import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useApp } from '@/context/AppContext';
import { finishGoogleLogin } from '@/lib/cloud/finish-google-login';
import { googleOAuthErrorMessage } from '@/lib/cloud/google-oauth-errors';
import { showMessage } from '@/lib/ui/confirm';
import { showToast } from '@/lib/ui/toast-registry';
import { consumeGoogleOAuthCallbackFromUrl } from '@/services/cloud/google-oauth-callback';

/** Handles Google OAuth full-page redirect on web (hash in URL → session → Settings). */
export function GoogleOAuthReturnHandler() {
  const { t } = useTranslation();
  const router = useRouter();
  const { reloadAccountData, syncCloud, updateSettings } = useApp();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    void (async () => {
      const result = await consumeGoogleOAuthCallbackFromUrl();
      if (!result) return;
      handledRef.current = true;
      if (result.type === 'success') {
        finishGoogleLogin({ updateSettings, reloadAccountData, syncCloud });
        router.replace('/(tabs)/settings');
        if (result.email) {
          showToast(t('settings.cloudWebLoginSuccess'), { title: t('settings.cloud') });
        }
        return;
      }
      showMessage(t('settings.cloud'), googleOAuthErrorMessage(result.message, t));
      router.replace('/(tabs)/settings');
    })();
  }, [reloadAccountData, router, syncCloud, t, updateSettings]);

  return null;
}
