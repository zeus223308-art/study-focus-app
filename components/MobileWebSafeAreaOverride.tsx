import { ReactNode, useMemo } from 'react';
import { Platform } from 'react-native';
import {
  SafeAreaInsetsContext,
  useSafeAreaInsets as useRawSafeAreaInsets,
} from 'react-native-safe-area-context';

import { isMobileWebPhone, useLayoutViewportSize } from '@/lib/ui/mobile-web-viewport';

type Props = { children: ReactNode };

/**
 * Mobile web phone: zero safe-area layout insets so iOS Safari matches Android Chrome
 * (same horizontal padding / no env() shrink). Notch overlap is handled by fixed dock gap.
 */
export function MobileWebSafeAreaOverride({ children }: Props) {
  const raw = useRawSafeAreaInsets();
  const { width, height } = useLayoutViewportSize();

  const insets = useMemo(() => {
    if (isMobileWebPhone(width, height)) {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }
    return raw;
  }, [raw, width, height]);

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <SafeAreaInsetsContext.Provider value={insets}>{children}</SafeAreaInsetsContext.Provider>
  );
}
