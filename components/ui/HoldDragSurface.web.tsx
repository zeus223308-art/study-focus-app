import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { HOLD_DRAG_MS } from '@/lib/ui/hold-drag';
import { resolveWebElement } from '@/lib/ui/resolve-web-element';

export { HOLD_DRAG_MS };

const MOVE_CANCEL_PX = 14;
const TAP_SLOP_PX = 16;

type Props = {
  enabled: boolean;
  onLift: () => void;
  onDragMove?: (pageX: number, pageY: number) => void;
  onDragEnd?: (moved: boolean, pageX: number, pageY: number) => void;
  onPress?: () => void;
  onGestureActiveChange?: (active: boolean) => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

function touchPageXY(t: Touch): { pageX: number; pageY: number } {
  return { pageX: t.pageX || t.clientX, pageY: t.pageY || t.clientY };
}

/**
 * Mobile web: bind touch listeners on the real DOM node (iOS Safari + github.io).
 * Pressable / RN onTouch* are unreliable inside overflow scroll parents.
 */
export function HoldDragSurface({
  enabled,
  onLift,
  onDragMove,
  onDragEnd,
  onPress,
  onGestureActiveChange,
  children,
  style,
}: Props) {
  const hostRef = useRef<View>(null);
  const [lifted, setLifted] = useState(false);

  const enabledRef = useRef(enabled);
  const liftedRef = useRef(false);
  const movedRef = useRef(false);
  const startRef = useRef({ pageX: 0, pageY: 0 });

  const onLiftRef = useRef(onLift);
  const onDragMoveRef = useRef(onDragMove);
  const onDragEndRef = useRef(onDragEnd);
  const onPressRef = useRef(onPress);
  const onGestureActiveChangeRef = useRef(onGestureActiveChange);

  enabledRef.current = enabled;
  onLiftRef.current = onLift;
  onDragMoveRef.current = onDragMove;
  onDragEndRef.current = onDragEnd;
  onPressRef.current = onPress;
  onGestureActiveChangeRef.current = onGestureActiveChange;

  const setLiftedState = useCallback((value: boolean) => {
    liftedRef.current = value;
    setLifted(value);
    onGestureActiveChangeRef.current?.(value);
  }, []);

  useLayoutEffect(() => {
    if (!enabled) return;

    const el = resolveWebElement(hostRef.current);
    if (!el) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let sessionMove: ((ev: TouchEvent) => void) | null = null;
    let sessionEnd: ((ev: TouchEvent) => void) | null = null;

    const clearTimer = () => {
      if (timer != null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const clearSession = () => {
      if (sessionMove) {
        document.removeEventListener('touchmove', sessionMove);
        sessionMove = null;
      }
      if (sessionEnd) {
        document.removeEventListener('touchend', sessionEnd);
        document.removeEventListener('touchcancel', sessionEnd);
        sessionEnd = null;
      }
    };

    const finish = (pageX: number, pageY: number) => {
      clearTimer();
      clearSession();
      const wasLifted = liftedRef.current;
      const moved = movedRef.current;
      setLiftedState(false);
      movedRef.current = false;

      if (wasLifted) {
        onDragEndRef.current?.(moved, pageX, pageY);
        return;
      }
      const dx = Math.abs(pageX - startRef.current.pageX);
      const dy = Math.abs(pageY - startRef.current.pageY);
      if (dx < TAP_SLOP_PX && dy < TAP_SLOP_PX) {
        onPressRef.current?.();
      }
    };

    const beginLift = (pageX: number, pageY: number) => {
      liftedRef.current = true;
      movedRef.current = false;
      setLiftedState(true);
      onLiftRef.current();
      onDragMoveRef.current?.(pageX, pageY);

      sessionMove = (ev: TouchEvent) => {
        if (!liftedRef.current) return;
        const t = ev.touches[0];
        if (!t) return;
        ev.preventDefault();
        movedRef.current = true;
        const pt = touchPageXY(t);
        onDragMoveRef.current?.(pt.pageX, pt.pageY);
      };

      sessionEnd = (ev: TouchEvent) => {
        const t = ev.changedTouches[0];
        if (!t) return;
        const pt = touchPageXY(t);
        finish(pt.pageX, pt.pageY);
      };

      document.addEventListener('touchmove', sessionMove, { passive: false });
      document.addEventListener('touchend', sessionEnd);
      document.addEventListener('touchcancel', sessionEnd);
    };

    const onTouchStart = (ev: TouchEvent) => {
      if (!enabledRef.current || ev.touches.length !== 1) return;
      const t = ev.touches[0]!;
      clearTimer();
      clearSession();
      liftedRef.current = false;
      movedRef.current = false;
      setLiftedState(false);
      startRef.current = touchPageXY(t);

      timer = setTimeout(() => {
        timer = null;
        beginLift(touchPageXY(t).pageX, touchPageXY(t).pageY);
      }, HOLD_DRAG_MS);
    };

    const onTouchMoveLocal = (ev: TouchEvent) => {
      if (liftedRef.current) return;
      if (!timer || ev.touches.length !== 1) return;
      const t = ev.touches[0]!;
      const pt = touchPageXY(t);
      const dx = Math.abs(pt.pageX - startRef.current.pageX);
      const dy = Math.abs(pt.pageY - startRef.current.pageY);
      if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) {
        clearTimer();
      }
    };

    const onTouchEndLocal = (ev: TouchEvent) => {
      if (liftedRef.current) return;
      const t = ev.changedTouches[0];
      if (!t) {
        clearTimer();
        return;
      }
      const pt = touchPageXY(t);
      if (timer) {
        clearTimer();
        finish(pt.pageX, pt.pageY);
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMoveLocal, { passive: true });
    el.addEventListener('touchend', onTouchEndLocal, { passive: true });
    el.addEventListener('touchcancel', onTouchEndLocal, { passive: true });

    el.style.touchAction = 'manipulation';
    el.style.webkitUserSelect = 'none';
    (el.style as CSSStyleDeclaration & { webkitTouchCallout?: string }).webkitTouchCallout = 'none';

    return () => {
      clearTimer();
      clearSession();
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMoveLocal);
      el.removeEventListener('touchend', onTouchEndLocal);
      el.removeEventListener('touchcancel', onTouchEndLocal);
    };
  }, [enabled, setLiftedState]);

  return (
    <View
      ref={hostRef}
      style={[style, styles.host, lifted && styles.hostLifted]}
      collapsable={false}
      {...({ 'data-hold-drag': lifted ? 'active' : 'idle' } as object)}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    width: '100%',
    touchAction: 'manipulation',
    cursor: 'grab',
    userSelect: 'none',
  } as unknown as ViewStyle,
  hostLifted: {
    touchAction: 'none',
    cursor: 'grabbing',
  } as unknown as ViewStyle,
});
