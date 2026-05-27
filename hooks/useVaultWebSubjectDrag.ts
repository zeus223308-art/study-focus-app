import { useEffect, useRef, type RefObject } from 'react';
import { Platform } from 'react-native';

/**
 * Mobile web (Chrome + Safari): listeners must exist before touchstart.
 * Gate with dragActiveRef — set true synchronously on lift, false on end.
 */
export function useVaultWebSubjectDrag(
  dragActiveRef: RefObject<boolean>,
  onMove: (pageX: number, pageY: number) => void
) {
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    const emit = (x: number, y: number) => {
      if (!dragActiveRef.current) return;
      onMoveRef.current(x, y);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!dragActiveRef.current) return;
      const t = e.touches[0];
      if (!t) return;
      if (e.cancelable) e.preventDefault();
      emit(t.clientX, t.clientY);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragActiveRef.current) return;
      if (e.pointerType === 'mouse' && (e.buttons & 1) === 0) return;
      if (e.cancelable) e.preventDefault();
      emit(e.clientX, e.clientY);
    };

    const lockScroll = () => {
      if (!dragActiveRef.current) return;
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.touchAction = 'none';
    };

    const unlockScroll = () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.touchAction = '';
    };

    const onTouchMoveWithLock = (e: TouchEvent) => {
      lockScroll();
      onTouchMove(e);
    };

    const onPointerMoveWithLock = (e: PointerEvent) => {
      lockScroll();
      onPointerMove(e);
    };

    const onEnd = () => {
      if (!dragActiveRef.current) return;
      unlockScroll();
    };

    window.addEventListener('touchmove', onTouchMoveWithLock, { passive: false, capture: true });
    window.addEventListener('pointermove', onPointerMoveWithLock, { passive: false, capture: true });
    window.addEventListener('touchend', onEnd, { capture: true });
    window.addEventListener('touchcancel', onEnd, { capture: true });
    window.addEventListener('pointerup', onEnd, { capture: true });

    return () => {
      window.removeEventListener('touchmove', onTouchMoveWithLock, true);
      window.removeEventListener('pointermove', onPointerMoveWithLock, true);
      window.removeEventListener('touchend', onEnd, true);
      window.removeEventListener('touchcancel', onEnd, true);
      window.removeEventListener('pointerup', onEnd, true);
      unlockScroll();
    };
  }, [dragActiveRef]);
}
