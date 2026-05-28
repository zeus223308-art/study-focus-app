import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect } from 'react';
import { Platform } from 'react-native';

/** Allow the OS auto-rotate / landscape lock to rotate the app (native only). */
export function useUnlockDeviceOrientation() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let cancelled = false;

    void (async () => {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.ALL);
      } catch {
        try {
          await ScreenOrientation.unlockAsync();
        } catch {
          // Expo Go preview — ignore
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);
}
