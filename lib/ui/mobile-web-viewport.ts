import { useEffect, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

import { getDeviceClass } from '@/lib/ui/viewport-layout';

/** Layout width/height — visualViewport on mobile web (Safari address bar / iOS clip fixes). */
export function useLayoutViewportSize(): { width: number; height: number } {
  const { width, height } = useWindowDimensions();
  const [size, setSize] = useState({ width, height });

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      setSize({ width, height });
      return;
    }

    const update = () => {
      const vv = window.visualViewport;
      const w = Math.round(vv?.width ?? window.innerWidth);
      const h = Math.round(vv?.height ?? window.innerHeight);
      setSize({ width: w, height: h });
    };

    update();
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [width, height]);

  if (Platform.OS !== 'web') return { width, height };
  return size;
}

export function isMobileWebPhone(width: number, height: number): boolean {
  return Platform.OS === 'web' && getDeviceClass(width, height) === 'phone';
}
