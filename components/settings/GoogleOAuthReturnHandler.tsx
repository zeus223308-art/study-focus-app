import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useApp } from '@/context/AppContext';
import { consumeGoogleOAuthCallbackFromUrl } from '@/services/cloud/google-oauth-callback';

/** Handles Google OAuth full-page redirect on web (hash in URL → session → Settings). */
export function GoogleOAuthReturnHandler() {
  const router = useRouter();
  const { refresh, updateSettings } = useApp();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    void (async () => {
      const result = await consumeGoogleOAuthCallbackFromUrl();
      if (!result) return;
      handledRef.current = true;
      if (result.type === 'success') {
        updateSettings({ cloudBackupEnabled: true });
        await refresh();
        router.replace('/(tabs)/settings');
      }
    })();
  }, [refresh, router, updateSettings]);

  return null;
}
