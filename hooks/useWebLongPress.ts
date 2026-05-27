import { useEffect, useRef } from 'react';
import type { View } from 'react-native';

import { HOLD_DRAG_MS } from '@/lib/ui/hold-drag';
import { resolveWebElement } from '@/lib/ui/resolve-web-element';

type Options = {
  enabled: boolean;
  onLongPress: () => void;
  delayMs?: number;
};

/** Mobile web: DOM long-press without enlarging the touch target (unlike HoldDragSurface host). */
export function useWebLongPress(ref: React.RefObject<View | null>, options: Options) {
  const { enabled, onLongPress, delayMs = HOLD_DRAG_MS } = options;
  const onLongPressRef = useRef(onLongPress);
  onLongPressRef.current = onLongPress;

  useEffect(() => {
    if (!enabled) return;

    let el: HTMLElement | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const clearTimer = () => {
      if (timer != null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const onStart = () => {
      clearTimer();
      timer = setTimeout(() => {
        timer = null;
        onLongPressRef.current();
      }, delayMs);
    };

    const onEnd = () => {
      clearTimer();
    };

    const bind = () => {
      el = resolveWebElement(ref.current);
      if (!el) return false;
      el.addEventListener('touchstart', onStart, { passive: true });
      el.addEventListener('touchend', onEnd, { passive: true });
      el.addEventListener('touchcancel', onEnd, { passive: true });
      el.addEventListener('mousedown', onStart);
      el.addEventListener('mouseup', onEnd);
      el.addEventListener('mouseleave', onEnd);
      return true;
    };

    const unbind = () => {
      if (!el) return;
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
      el.removeEventListener('mousedown', onStart);
      el.removeEventListener('mouseup', onEnd);
      el.removeEventListener('mouseleave', onEnd);
      el = null;
    };

    if (!bind()) {
      const retry = () => {
        attempts += 1;
        if (bind() || attempts >= 8) return;
        requestAnimationFrame(retry);
      };
      requestAnimationFrame(retry);
    }

    return () => {
      clearTimer();
      unbind();
    };
  }, [delayMs, enabled, ref]);
}
