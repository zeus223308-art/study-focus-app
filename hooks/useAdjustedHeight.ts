import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export type AdjustedViewport = {
  /** visualViewport height (or innerHeight). */
  viewportHeight: number;
  /** Pixels covered by virtual keyboard at bottom. */
  keyboardOffset: number;
  isKeyboardOpen: boolean;
};

/**
 * Tracks visualViewport for iOS Safari keyboard overlay.
 * Android Chrome baseline: offset stays 0 when the browser resizes the layout.
 */
export function useAdjustedHeight(): AdjustedViewport {
  const [state, setState] = useState<AdjustedViewport>({
    viewportHeight: 0,
    keyboardOffset: 0,
    isKeyboardOpen: false,
  });

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const update = () => {
      const vv = window.visualViewport;
      const layoutH = window.innerHeight;
      const visibleH = Math.round(vv?.height ?? layoutH);
      const top = vv?.offsetTop ?? 0;
      const keyboardOffset = Math.max(0, Math.round(layoutH - visibleH - top));
      setState({
        viewportHeight: visibleH,
        keyboardOffset,
        isKeyboardOpen: keyboardOffset > 50,
      });
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
  }, []);

  return state;
}
