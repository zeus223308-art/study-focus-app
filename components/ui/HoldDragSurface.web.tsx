import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type GestureResponderEvent,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { theme } from '@/constants/theme';
import { DELETE_ARM_MS, HOLD_DRAG_MS } from '@/lib/ui/hold-drag';
import { resolveWebElement } from '@/lib/ui/resolve-web-element';

export { HOLD_DRAG_MS };

const MOVE_CANCEL_PX = 10;
const TAP_SLOP_PX = 16;

type Props = {
  enabled: boolean;
  onLift: () => void;
  onDragMove?: (pageX: number, pageY: number) => void;
  onDragEnd?: (moved: boolean, pageX: number, pageY: number) => void;
  onPress?: () => void;
  onDeleteHold?: () => void;
  onGestureActiveChange?: (active: boolean) => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

type Point = { pageX: number; pageY: number };

function touchPageXY(t: Touch): Point {
  return { pageX: t.pageX || t.clientX, pageY: t.pageY || t.clientY };
}

function eventPoint(e: GestureResponderEvent): Point {
  const ne = e.nativeEvent as { pageX?: number; pageY?: number };
  return { pageX: ne.pageX ?? 0, pageY: ne.pageY ?? 0 };
}

/**
 * Mobile web (Chrome / Safari): DOM touch + RN onTouch fallback.
 */
export function HoldDragSurface({
  enabled,
  onLift,
  onDragMove,
  onDragEnd,
  onPress,
  onDeleteHold,
  onGestureActiveChange,
  children,
  style,
}: Props) {
  const hostRef = useRef<View>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const domBoundRef = useRef(false);
  const phaseRef = useRef<'idle' | 'pending' | 'lifted'>('idle');
  const [lifted, setLifted] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);

  const enabledRef = useRef(enabled);
  const movedRef = useRef(false);
  const startRef = useRef<Point>({ pageX: 0, pageY: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionCleanupRef = useRef<(() => void) | null>(null);
  const deleteArmedRef = useRef(false);
  const deleteArmedAtRef = useRef(0);
  const deleteHoldRef = useRef(false);

  const onLiftRef = useRef(onLift);
  const onDragMoveRef = useRef(onDragMove);
  const onDragEndRef = useRef(onDragEnd);
  const onPressRef = useRef(onPress);
  const onDeleteHoldRef = useRef(onDeleteHold);
  const onGestureActiveChangeRef = useRef(onGestureActiveChange);

  enabledRef.current = enabled;
  onLiftRef.current = onLift;
  onDragMoveRef.current = onDragMove;
  onDragEndRef.current = onDragEnd;
  onPressRef.current = onPress;
  onDeleteHoldRef.current = onDeleteHold;
  onGestureActiveChangeRef.current = onGestureActiveChange;

  const setLiftedState = useCallback((value: boolean) => {
    setLifted(value);
    onGestureActiveChangeRef.current?.(value);
  }, []);

  const setArmed = useCallback((armed: boolean) => {
    deleteArmedRef.current = armed;
    setDeleteArmed(armed);
    if (armed) deleteArmedAtRef.current = Date.now();
  }, []);

  const isDeleteArmActive = useCallback(() => {
    if (!deleteArmedRef.current) return false;
    if (Date.now() - deleteArmedAtRef.current > DELETE_ARM_MS) {
      setArmed(false);
      return false;
    }
    return true;
  }, [setArmed]);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearSession = useCallback(() => {
    sessionCleanupRef.current?.();
    sessionCleanupRef.current = null;
  }, []);

  const finish = useCallback(
    (pageX: number, pageY: number) => {
      clearTimer();
      clearSession();
      const phase = phaseRef.current;
      const moved = movedRef.current;
      const wasDeleteHold = deleteHoldRef.current;
      phaseRef.current = 'idle';
      movedRef.current = false;
      deleteHoldRef.current = false;
      setLiftedState(false);

      if (phase === 'lifted') {
        onDragEndRef.current?.(moved, pageX, pageY);
        return;
      }
      if (phase !== 'pending') return;

      const dx = Math.abs(pageX - startRef.current.pageX);
      const dy = Math.abs(pageY - startRef.current.pageY);
      if (dx >= TAP_SLOP_PX || dy >= TAP_SLOP_PX) return;

      if (onDeleteHoldRef.current) {
        if (wasDeleteHold) {
          setArmed(false);
          return;
        }
        if (!deleteArmedRef.current) {
          setArmed(true);
          return;
        }
        if (isDeleteArmActive()) {
          setArmed(false);
          return;
        }
      }

      setArmed(false);
      onPressRef.current?.();
    },
    [clearSession, clearTimer, isDeleteArmActive, setArmed, setLiftedState]
  );

  const beginLift = useCallback(
    (pageX: number, pageY: number) => {
      if (phaseRef.current !== 'pending') return;

      if (deleteHoldRef.current && onDeleteHoldRef.current) {
        phaseRef.current = 'idle';
        clearTimer();
        setArmed(false);
        onDeleteHoldRef.current();
        return;
      }

      phaseRef.current = 'lifted';
      movedRef.current = false;
      setLiftedState(true);
      onLiftRef.current();
      onDragMoveRef.current?.(pageX, pageY);

      const onMove = (ev: TouchEvent) => {
        if (phaseRef.current !== 'lifted') return;
        const t = ev.touches[0];
        if (!t) return;
        ev.preventDefault();
        movedRef.current = true;
        const pt = touchPageXY(t);
        onDragMoveRef.current?.(pt.pageX, pt.pageY);
      };

      const onEnd = (ev: TouchEvent) => {
        const t = ev.changedTouches[0];
        if (!t) return;
        const pt = touchPageXY(t);
        finish(pt.pageX, pt.pageY);
      };

      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onEnd);
      document.addEventListener('touchcancel', onEnd);
      sessionCleanupRef.current = () => {
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
        document.removeEventListener('touchcancel', onEnd);
      };
    },
    [clearTimer, finish, setArmed, setLiftedState]
  );

  const startPending = useCallback(
    (pageX: number, pageY: number) => {
      if (!enabledRef.current) return;
      clearTimer();
      clearSession();
      phaseRef.current = 'pending';
      movedRef.current = false;
      setLiftedState(false);
      startRef.current = { pageX, pageY };
      deleteHoldRef.current = Boolean(
        onDeleteHoldRef.current && isDeleteArmActive()
      );

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        beginLift(pageX, pageY);
      }, HOLD_DRAG_MS);
    },
    [beginLift, clearSession, clearTimer, isDeleteArmActive, setLiftedState]
  );

  const movePending = useCallback(
    (pageX: number, pageY: number) => {
      if (phaseRef.current === 'lifted') {
        movedRef.current = true;
        onDragMoveRef.current?.(pageX, pageY);
        return;
      }
      if (phaseRef.current !== 'pending' || !timerRef.current) return;
      const dx = Math.abs(pageX - startRef.current.pageX);
      const dy = Math.abs(pageY - startRef.current.pageY);
      if (dx > MOVE_CANCEL_PX && dx > dy) {
        clearTimer();
        phaseRef.current = 'idle';
        deleteHoldRef.current = false;
      }
    },
    [clearTimer]
  );

  const bindDom = useCallback(
    (node: View | null) => {
      cleanupRef.current?.();
      cleanupRef.current = null;
      domBoundRef.current = false;
      if (!node || !enabledRef.current) return;

      const el = resolveWebElement(node);
      if (!el) return;
      domBoundRef.current = true;

      const onTouchStart = (ev: TouchEvent) => {
        if (!enabledRef.current || ev.touches.length !== 1) return;
        const t = ev.touches[0]!;
        startPending(touchPageXY(t).pageX, touchPageXY(t).pageY);
      };

      const onTouchMove = (ev: TouchEvent) => {
        const t = ev.touches[0];
        if (!t) return;
        if (phaseRef.current === 'lifted') ev.preventDefault();
        movePending(touchPageXY(t).pageX, touchPageXY(t).pageY);
      };

      const onTouchEnd = (ev: TouchEvent) => {
        if (phaseRef.current === 'lifted') return;
        const t = ev.changedTouches[0];
        if (!t) {
          clearTimer();
          return;
        }
        const pt = touchPageXY(t);
        if (timerRef.current) finish(pt.pageX, pt.pageY);
      };

      el.addEventListener('touchstart', onTouchStart, { passive: true });
      el.addEventListener('touchmove', onTouchMove, { passive: false });
      el.addEventListener('touchend', onTouchEnd, { passive: true });
      el.addEventListener('touchcancel', onTouchEnd, { passive: true });

      el.style.touchAction = phaseRef.current === 'lifted' ? 'none' : 'manipulation';
      el.style.webkitUserSelect = 'none';
      (el.style as CSSStyleDeclaration & { webkitTouchCallout?: string }).webkitTouchCallout =
        'none';

      cleanupRef.current = () => {
        domBoundRef.current = false;
        el.removeEventListener('touchstart', onTouchStart);
        el.removeEventListener('touchmove', onTouchMove);
        el.removeEventListener('touchend', onTouchEnd);
        el.removeEventListener('touchcancel', onTouchEnd);
      };
    },
    [clearTimer, finish, movePending, startPending]
  );

  const setHostRef = useCallback(
    (node: View | null) => {
      hostRef.current = node;
      bindDom(node);
      if (!node || !enabledRef.current) return;
      if (resolveWebElement(node)) return;
      let attempts = 0;
      const retry = () => {
        attempts += 1;
        bindDom(hostRef.current);
        if (!cleanupRef.current && attempts < 8) {
          requestAnimationFrame(retry);
        }
      };
      requestAnimationFrame(retry);
    },
    [bindDom]
  );

  useEffect(() => {
    if (!enabled) {
      cleanupRef.current?.();
      cleanupRef.current = null;
      clearTimer();
      clearSession();
      return;
    }
    bindDom(hostRef.current);
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
      clearTimer();
      clearSession();
    };
  }, [bindDom, clearSession, clearTimer, enabled]);

  const onTouchStartRn = useCallback(
    (e: GestureResponderEvent) => {
      if (domBoundRef.current) return;
      const p = eventPoint(e);
      startPending(p.pageX, p.pageY);
    },
    [startPending]
  );

  const onTouchMoveRn = useCallback(
    (e: GestureResponderEvent) => {
      if (domBoundRef.current && phaseRef.current !== 'lifted') return;
      const p = eventPoint(e);
      movePending(p.pageX, p.pageY);
    },
    [movePending]
  );

  const onTouchEndRn = useCallback(
    (e: GestureResponderEvent) => {
      if (domBoundRef.current && phaseRef.current !== 'lifted') return;
      if (phaseRef.current === 'lifted') {
        const p = eventPoint(e);
        finish(p.pageX, p.pageY);
        return;
      }
      if (timerRef.current) {
        const p = eventPoint(e);
        finish(p.pageX, p.pageY);
      }
    },
    [finish]
  );

  return (
    <View
      ref={setHostRef}
      onTouchStart={enabled ? onTouchStartRn : undefined}
      onTouchMove={enabled ? onTouchMoveRn : undefined}
      onTouchEnd={enabled ? onTouchEndRn : undefined}
      onTouchCancel={enabled ? onTouchEndRn : undefined}
      style={[
        style,
        styles.host,
        lifted && styles.hostLifted,
        deleteArmed && onDeleteHold ? styles.hostDeleteArmed : null,
      ]}
      collapsable={false}
      {...({ 'data-hold-drag': lifted ? 'active' : 'idle', 'data-vault-tile': '1' } as object)}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    width: '100%',
    minHeight: 44,
    touchAction: 'manipulation',
    cursor: 'grab',
    userSelect: 'none',
  } as unknown as ViewStyle,
  hostLifted: {
    touchAction: 'none',
    cursor: 'grabbing',
    zIndex: 40,
  } as unknown as ViewStyle,
  hostDeleteArmed: {
    borderWidth: 2,
    borderColor: theme.orange,
    borderRadius: theme.radius.sm,
  } as unknown as ViewStyle,
});
