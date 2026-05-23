import { useEffect } from 'react';

import { ensureGoogleDriveSession } from '@/services/cloud/google-session';

/** Restores Google session (and refreshes tokens) as soon as the app starts. */
export function GoogleAuthBootstrap() {
  useEffect(() => {
    void ensureGoogleDriveSession();
  }, []);

  return null;
}
