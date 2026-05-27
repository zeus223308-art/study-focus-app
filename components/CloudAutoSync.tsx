import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useApp } from '@/context/AppContext';
import { useGoogleDriveAuth } from '@/hooks/useGoogleDriveAuth';

const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;

/** Pushes/pulls Google Drive backup every 5 minutes while signed in. */
export function CloudAutoSync() {
  const { ready, syncCloud } = useApp();
  const { session } = useGoogleDriveAuth();
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!ready || !session?.email) return;

    let cancelled = false;

    const run = async () => {
      if (cancelled || syncingRef.current) return;
      syncingRef.current = true;
      try {
        await syncCloud();
      } catch {
        /* auto-sync is best-effort */
      } finally {
        syncingRef.current = false;
      }
    };

    void run();
    const intervalId = setInterval(() => void run(), AUTO_SYNC_INTERVAL_MS);

    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') void run();
    };
    const sub = AppState.addEventListener('change', onAppState);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      sub.remove();
    };
  }, [ready, session?.email, syncCloud]);

  return null;
}
