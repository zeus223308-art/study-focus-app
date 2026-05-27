import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type GestureResponderEvent,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {
  DELETE_STILL_HOLD_MS,
  HOLD_DRAG_MS,
  MERGE_HOLD_DRAG_MS,
  TRIPLE_TAP_MERGE_MS,
} from '@/lib/ui/hold-drag';
import {
  clearMergeTapState,
  onMergeTouchRelease,
  shouldMergeHoldOnTouchStart,
  type MergeTapRefs,
} from '@/lib/ui/merge-tap-hold';
import { resolveWebElement } from '@/lib/ui/resolve-web-element';

export { HOLD_DRAG_MS };

const MOVE_CANCEL_PX = 10;
const TAP_SLOP_PX = 16;
const DELETE_PAIR_MS = 420;
const OPEN_DEFER_MS = 120;

type Props = {
  enabled: boolean;
  onLift: (pageX: number, pageY: number) => void;
  onDragMove?: (pageX: number, pageY: number) => void;
  onDragEnd?: (moved: boolean, pageX: number, pageY: number) => void;
  onPress?: () => void;
  onDeleteHold?: () => void;
  deleteOnStillHold?: boolean;
  onHoldMenu?: () => void;
  onMergeHold?: () => void;
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
  deleteOnStillHold = false,
  onHoldMenu,
  onMergeHold,
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
  const dragIntentRef = useRef(false);
  const mergeHoldRef = useRef(false);
  const mergeTapRefs = useRef<MergeTapRefs>({
    tapCount: { current: 0 },
    lastReleaseAt: { current: 0 },
    mergeArmed: { current: false },
  }).current;
  const tapCountRef = mergeTapRefs.tapCount;
  const lastReleaseAtRef = mergeTapRefs.lastReleaseAt;
  const mergeArmedRef = mergeTapRefs.mergeArmed;

  const onLiftRef = useRef(onLift);
  const onDragMoveRef = useRef(onDragMove);
  const onDragEndRef = useRef(onDragEnd);
  const onPressRef = useRef(onPress);
  const onDeleteHoldRef = useRef(onDeleteHold);
  const deleteOnStillHoldRef = useRef(deleteOnStillHold);
  const onHoldMenuRef = useRef(onHoldMenu);
  const onMergeHoldRef = useRef(onMergeHold);
  const onGestureActiveChangeRef = useRef(onGestureActiveChange);

  enabledRef.current = enabled;
  onLiftRef.current = onLift;
  onDragMoveRef.current = onDragMove;
  onDragEndRef.current = onDragEnd;
  onPressRef.current = onPress;
  onDeleteHoldRef.current = onDeleteHold;
  deleteOnStillHoldRef.current = deleteOnStillHold;
  onHoldMenuRef.current = onHoldMenu;
  onMergeHoldRef.current = onMergeHold;
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
      const wasMergePending = mergeHoldRef.current;
      clearTimer();
      clearSession();
      const phase = phaseRef.current;
      const moved = movedRef.current;
      phaseRef.current = 'idle';
      movedRef.current = false;
      deleteHoldRef.current = false;
      dragIntentRef.current = false;
      mergeHoldRef.current = false;
      setLiftedState(false);

      if (phase === 'lifted') {
        onDragEndRef.current?.(moved, pageX, pageY);
        return;
      }
      if (phase !== 'pending') return;

      const dx = Math.abs(pageX - startRef.current.pageX);
      const dy = Math.abs(pageY - startRef.current.pageY);
      const movedTooFar = dx >= TAP_SLOP_PX || dy >= TAP_SLOP_PX;

      if (onMergeHoldRef.current) {
        onMergeTouchRelease(mergeTapRefs, {
          wasMergePending,
          movedTooFar,
          hasMergeHold: true,
        });
        clearOpenDefer();
        if (
          !wasMergePending &&
          !movedTooFar &&
          tapCountRef.current === 1 &&
          !mergeArmedRef.current &&
          onPressRef.current
        ) {
          openDeferRef.current = setTimeout(() => {
            openDeferRef.current = null;
            if (tapCountRef.current === 1 && !mergeArmedRef.current) {
              tapCountRef.current = 0;
              onPressRef.current?.();
            }
          }, TRIPLE_TAP_MERGE_MS);
        }
        return;
      }

      if (movedTooFar) return;

      lastReleaseAtRef.current = Date.now();
      scheduleOpen();
    },
    [clearOpenDefer, clearSession, clearTimer, mergeTapRefs, scheduleOpen, setLiftedState]
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

      if (mergeHoldRef.current && onMergeHoldRef.current) {
        phaseRef.current = 'lifted';
        movedRef.current = false;
        clearMergeTapState(mergeTapRefs);
        setLiftedState(true);
        clearOpenDefer();
        onMergeHoldRef.current();
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
        return;
      }

      if (onHoldMenuRef.current) {
        phaseRef.current = 'idle';
        clearTimer();
        clearOpenDefer();
        onHoldMenuRef.current();
        return;
      }

      if (
        deleteOnStillHoldRef.current &&
        onDeleteHoldRef.current &&
        !dragIntentRef.current
      ) {
        phaseRef.current = 'idle';
        clearTimer();
        clearOpenDefer();
        dragIntentRef.current = false;
        onDeleteHoldRef.current();
        return;
      }

      phaseRef.current = 'lifted';
      movedRef.current = false;
      setLiftedState(true);
      onLiftRef.current(pageX, pageY);
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
    [clearOpenDefer, clearTimer, finish, setLiftedState]
  );

  const startPending = useCallback(
    (pageX: number, pageY: number) => {
      if (!enabledRef.current) return;
      clearTimer();
      clearSession();
      phaseRef.current = 'pending';
      movedRef.current = false;
      dragIntentRef.current = false;
      setLiftedState(false);
      startRef.current = { pageX, pageY };
      const sinceRelease = Date.now() - lastReleaseAtRef.current;

      if (shouldMergeHoldOnTouchStart(mergeTapRefs, Boolean(onMergeHoldRef.current))) {
        clearOpenDefer();
        mergeHoldRef.current = true;
      } else {
        mergeHoldRef.current = false;
      }
      if (
        !deleteOnStillHoldRef.current &&
        onDeleteHoldRef.current &&
        lastReleaseAtRef.current > 0 &&
        sinceRelease < DELETE_PAIR_MS
      ) {
        clearOpenDefer();
        deleteHoldRef.current = true;
      } else if (!mergeHoldRef.current) {
        deleteHoldRef.current = false;
      }

      const delay = mergeHoldRef.current
        ? MERGE_HOLD_DRAG_MS
        : deleteOnStillHoldRef.current
          ? DELETE_STILL_HOLD_MS
          : HOLD_DRAG_MS;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        beginLift(pageX, pageY);
      }, delay);
    },
    [beginLift, clearOpenDefer, clearSession, clearTimer, setLiftedState]
  );

  const rescheduleReorderLift = useCallback(
    (pageX: number, pageY: number) => {
      clearTimer();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        beginLift(pageX, pageY);
      }, HOLD_DRAG_MS);
    },
    [beginLift, clearTimer]
  );

  const movePending = useCallback(
    (pageX: number, pageY: number) => {
      if (phaseRef.current === 'lifted') {
        movedRef.current = true;
        onDragMoveRef.current?.(pageX, pageY);
        return;
      }
      if (phaseRef.current !== 'pending' || !timerRef.current) return;
      if (mergeHoldRef.current) return;
      const dx = Math.abs(pageX - startRef.current.pageX);
      const dy = Math.abs(pageY - startRef.current.pageY);
      if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) {
        if (deleteOnStillHoldRef.current) {
          if (!dragIntentRef.current) {
            dragIntentRef.current = true;
            rescheduleReorderLift(pageX, pageY);
          }
          return;
        }
        if (mergeHoldRef.current) return;
        if (onDragMoveRef.current && dy >= MOVE_CANCEL_PX && dy >= dx) {
          clearTimer();
          beginLift(pageX, pageY);
          return;
        }
        if (dx > MOVE_CANCEL_PX && dx > dy) {
          clearTimer();
          phaseRef.current = 'idle';
          deleteHoldRef.current = false;
        }
      }
    },
    [beginLift, clearTimer, rescheduleReorderLift]
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
