import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type GestureResponderEvent,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { HOLD_DRAG_MS } from '@/lib/ui/hold-drag';
import { resolveWebElement } from '@/lib/ui/resolve-web-element';

export { HOLD_DRAG_MS };

const MOVE_CANCEL_PX = 10;
const TAP_SLOP_PX = 16;
const DELETE_PAIR_MS = 420;
const OPEN_DEFER_MS = 120;

type Props = {
  enabled: boolean;
  onLift: () => void;
  onDragMove?: (pageX: number, pageY: number) => void;
  onDragEnd?: (moved: boolean, pageX: number, pageY: number) => void;
  onPress?: () => void;
  onHoldMenu?: () => void;
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
  onHoldMenu,
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

  const enabledRef = useRef(enabled);
  const movedRef = useRef(false);
  const startRef = useRef<Point>({ pageX: 0, pageY: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openDeferRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionCleanupRef = useRef<(() => void) | null>(null);
  const deleteHoldRef = useRef(false);
  const lastReleaseAtRef = useRef(0);

  const onLiftRef = useRef(onLift);
  const onDragMoveRef = useRef(onDragMove);
  const onDragEndRef = useRef(onDragEnd);
  const onPressRef = useRef(onPress);
  const onDeleteHoldRef = useRef(onDeleteHold);
  const onHoldMenuRef = useRef(onHoldMenu);
  const onGestureActiveChangeRef = useRef(onGestureActiveChange);

  enabledRef.current = enabled;
  onLiftRef.current = onLift;
  onDragMoveRef.current = onDragMove;
  onDragEndRef.current = onDragEnd;
  onPressRef.current = onPress;
  onDeleteHoldRef.current = onDeleteHold;
  onHoldMenuRef.current = onHoldMenu;
  onGestureActiveChangeRef.current = onGestureActiveChange;

  const setLiftedState = useCallback((value: boolean) => {
    setLifted(value);
    onGestureActiveChangeRef.current?.(value);
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearOpenDefer = useCallback(() => {
    if (openDeferRef.current != null) {
      clearTimeout(openDeferRef.current);
      openDeferRef.current = null;
    }
  }, []);

  const clearSession = useCallback(() => {
    sessionCleanupRef.current?.();
    sessionCleanupRef.current = null;
  }, []);

  const scheduleOpen = useCallback(() => {
    if (!onPressRef.current) return;
    if (!onDeleteHoldRef.current) {
      onPressRef.current();
      return;
    }
    clearOpenDefer();
    openDeferRef.current = setTimeout(() => {
      openDeferRef.current = null;
      onPressRef.current?.();
    }, OPEN_DEFER_MS);
  }, [clearOpenDefer]);

  const finish = useCallback(
    (pageX: number, pageY: number) => {
      clearTimer();
      clearSession();
      const phase = phaseRef.current;
      const moved = movedRef.current;
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

      lastReleaseAtRef.current = Date.now();
      scheduleOpen();
    },
    [clearSession, clearTimer, scheduleOpen, setLiftedState]
  );

  const beginLift = useCallback(
    (pageX: number, pageY: number) => {
      if (phaseRef.current !== 'pending') return;

      if (deleteHoldRef.current && onDeleteHoldRef.current) {
        phaseRef.current = 'idle';
        clearTimer();
        clearOpenDefer();
        onDeleteHoldRef.current();
        return;
      }

      if (onHoldMenuRef.current) {
        phaseRef.current = 'idle';
        clearTimer();
        clearOpenDefer();
        onHoldMenuRef.current();
        return;
      }

      phaseRef.current = 'lifted';
      movedRef.current = false;
      setLiftedState(true);
      onLiftRef.current();
      onDragMoveRef.current?.(pageX, pageY);

      const onTouchMoveDoc = (ev: TouchEvent) => {
        if (phaseRef.current !== 'lifted') return;
        const t = ev.touches[0];
        if (!t) return;
        ev.preventDefault();
        movedRef.current = true;
        const pt = touchPageXY(t);
        onDragMoveRef.current?.(pt.pageX, pt.pageY);
      };

      const onTouchEndDoc = (ev: TouchEvent) => {
        const t = ev.changedTouches[0];
        if (!t) return;
        const pt = touchPageXY(t);
        finish(pt.pageX, pt.pageY);
      };

      const onMouseMoveDoc = (ev: MouseEvent) => {
        if (phaseRef.current !== 'lifted') return;
        ev.preventDefault();
        movedRef.current = true;
        onDragMoveRef.current?.(ev.clientX, ev.clientY);
      };

      const onMouseUpDoc = (ev: MouseEvent) => {
        finish(ev.clientX, ev.clientY);
      };

      document.addEventListener('touchmove', onTouchMoveDoc, { passive: false });
      document.addEventListener('touchend', onTouchEndDoc);
      document.addEventListener('touchcancel', onTouchEndDoc);
      document.addEventListener('mousemove', onMouseMoveDoc);
      document.addEventListener('mouseup', onMouseUpDoc);
      sessionCleanupRef.current = () => {
        document.removeEventListener('touchmove', onTouchMoveDoc);
        document.removeEventListener('touchend', onTouchEndDoc);
        document.removeEventListener('touchcancel', onTouchEndDoc);
        document.removeEventListener('mousemove', onMouseMoveDoc);
        document.removeEventListener('mouseup', onMouseUpDoc);
      };
    },
    [clearOpenDefer, clearTimer, finish, setLiftedState]
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

      const sinceRelease = Date.now() - lastReleaseAtRef.current;
      if (
        onDeleteHoldRef.current &&
        lastReleaseAtRef.current > 0 &&
        sinceRelease < DELETE_PAIR_MS
      ) {
        clearOpenDefer();
        deleteHoldRef.current = true;
      } else {
        deleteHoldRef.current = false;
      }

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        beginLift(pageX, pageY);
      }, HOLD_DRAG_MS);
    },
    [beginLift, clearOpenDefer, clearSession, clearTimer, setLiftedState]
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

      const onMouseDown = (ev: MouseEvent) => {
        if (!enabledRef.current || ev.button !== 0) return;
        startPending(ev.clientX, ev.clientY);
      };

      const onMouseMove = (ev: MouseEvent) => {
        if (phaseRef.current === 'lifted') {
          movedRef.current = true;
          onDragMoveRef.current?.(ev.clientX, ev.clientY);
          return;
        }
        movePending(ev.clientX, ev.clientY);
      };

      const onMouseUp = (ev: MouseEvent) => {
        if (phaseRef.current === 'lifted') {
          finish(ev.clientX, ev.clientY);
          return;
        }
        if (timerRef.current) finish(ev.clientX, ev.clientY);
      };

      el.addEventListener('touchstart', onTouchStart, { passive: true });
      el.addEventListener('touchmove', onTouchMove, { passive: false });
      el.addEventListener('touchend', onTouchEnd, { passive: true });
      el.addEventListener('touchcancel', onTouchEnd, { passive: true });
      el.addEventListener('mousedown', onMouseDown);
      el.addEventListener('mousemove', onMouseMove);
      el.addEventListener('mouseup', onMouseUp);
      el.addEventListener('mouseleave', onMouseUp);

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
        el.removeEventListener('mousedown', onMouseDown);
        el.removeEventListener('mousemove', onMouseMove);
        el.removeEventListener('mouseup', onMouseUp);
        el.removeEventListener('mouseleave', onMouseUp);
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
      clearOpenDefer();
      clearSession();
      return;
    }
    bindDom(hostRef.current);
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
      clearTimer();
      clearOpenDefer();
      clearSession();
    };
  }, [bindDom, clearOpenDefer, clearSession, clearTimer, enabled]);

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
      style={[style, styles.host, lifted && styles.hostLifted]}
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
});
