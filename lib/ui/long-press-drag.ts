import { useCallback, useEffect, useMemo, useRef } from 'react';
import { PanResponder, Platform, type GestureResponderEvent } from 'react-native';

/** Hold duration before lift-and-drag starts. */
export const LONG_PRESS_DRAG_MS = 680;
/** Finger movement before hold is cancelled (scroll / tap). */
export const LONG_PRESS_CANCEL_SLOP = 14;

type Point = { pageX: number; pageY: number };

type Options = {
  enabled: boolean;
  /** Skip hold timer when item is already lifted (second drag attempt). */
  instantDrag?: boolean;
  onLift: () => void;
  onDragMove?: (pageX: number, pageY: number) => void;
  onDragEnd?: (moved: boolean, pageX: number, pageY: number) => void;
  onShortPress?: () => void;
};

function pagePoint(evt: GestureResponderEvent): Point {
  const { pageX, pageY } = evt.nativeEvent;
  return { pageX, pageY };
}

/** Hold, then drag on the same touch — no release between lift and move. */
export function useLongPressDragGesture({
  enabled,
  instantDrag = false,
  onLift,
  onDragMove,
  onDragEnd,
  onShortPress,
}: Options) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<Point | null>(null);
  const armedRef = useRef(false);
  const didDragRef = useRef(false);
  const dragActiveRef = useRef(false);

  const clearHoldTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearHoldTimer(), [clearHoldTimer]);

  const beginDrag = useCallback(
    (pageX: number, pageY: number) => {
      armedRef.current = true;
      dragActiveRef.current = true;
      didDragRef.current = false;
      startRef.current = { pageX, pageY };
      onLift();
    },
    [onLift]
  );

  const moveDrag = useCallback(
    (pageX: number, pageY: number) => {
      if (!armedRef.current || !dragActiveRef.current || !startRef.current) return;
      const dx = pageX - startRef.current.pageX;
      const dy = pageY - startRef.current.pageY;
      if (Math.abs(dx) > LONG_PRESS_CANCEL_SLOP || Math.abs(dy) > LONG_PRESS_CANCEL_SLOP) {
        didDragRef.current = true;
      }
      onDragMove?.(pageX, pageY);
    },
    [onDragMove]
  );

  const endDrag = useCallback(
    (pageX: number, pageY: number) => {
      clearHoldTimer();
      if (armedRef.current && dragActiveRef.current) {
        dragActiveRef.current = false;
        onDragEnd?.(didDragRef.current, pageX, pageY);
        armedRef.current = false;
        didDragRef.current = false;
        startRef.current = null;
        return;
      }
      if (startRef.current) {
        const dx = pageX - startRef.current.pageX;
        const dy = pageY - startRef.current.pageY;
        const moved = Math.abs(dx) > LONG_PRESS_CANCEL_SLOP || Math.abs(dy) > LONG_PRESS_CANCEL_SLOP;
        if (!moved) onShortPress?.();
      }
      startRef.current = null;
    },
    [clearHoldTimer, onDragEnd, onShortPress]
  );

  const onGrant = useCallback(
    (evt: GestureResponderEvent) => {
      if (!enabled) return;
      const { pageX, pageY } = pagePoint(evt);
      startRef.current = { pageX, pageY };
      armedRef.current = false;
      didDragRef.current = false;
      dragActiveRef.current = false;
      clearHoldTimer();
      if (instantDrag) {
        beginDrag(pageX, pageY);
        return;
      }
      timerRef.current = setTimeout(() => beginDrag(pageX, pageY), LONG_PRESS_DRAG_MS);
    },
    [beginDrag, clearHoldTimer, enabled, instantDrag]
  );

  const onMove = useCallback(
    (evt: GestureResponderEvent) => {
      const { pageX, pageY } = pagePoint(evt);
      if (!enabled) return;
      if (armedRef.current) {
        moveDrag(pageX, pageY);
        return;
      }
      if (timerRef.current && startRef.current) {
        const dx = pageX - startRef.current.pageX;
        const dy = pageY - startRef.current.pageY;
        if (Math.abs(dx) > LONG_PRESS_CANCEL_SLOP || Math.abs(dy) > LONG_PRESS_CANCEL_SLOP) {
          clearHoldTimer();
        }
      }
    },
    [clearHoldTimer, enabled, moveDrag]
  );

  const onRelease = useCallback(
    (evt: GestureResponderEvent) => {
      endDrag(pagePoint(evt).pageX, pagePoint(evt).pageY);
    },
    [endDrag]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => enabled,
        onMoveShouldSetPanResponder: () => enabled,
        onPanResponderGrant: onGrant,
        onPanResponderMove: onMove,
        onPanResponderRelease: onRelease,
        onPanResponderTerminate: onRelease,
      }),
    [enabled, onGrant, onMove, onRelease]
  );

  const bindWebMouse = useCallback(
    (pageX: number, pageY: number) => {
      if (!enabled || typeof document === 'undefined') return;
      startRef.current = { pageX, pageY };
      armedRef.current = false;
      clearHoldTimer();
      if (instantDrag) {
        beginDrag(pageX, pageY);
      } else {
        timerRef.current = setTimeout(() => beginDrag(pageX, pageY), LONG_PRESS_DRAG_MS);
      }

      const onMove = (ev: MouseEvent) => {
        if (armedRef.current) {
          moveDrag(ev.pageX, ev.pageY);
          return;
        }
        if (timerRef.current && startRef.current) {
          const dx = ev.pageX - startRef.current.pageX;
          const dy = ev.pageY - startRef.current.pageY;
          if (Math.abs(dx) > LONG_PRESS_CANCEL_SLOP || Math.abs(dy) > LONG_PRESS_CANCEL_SLOP) {
            clearHoldTimer();
          }
        }
      };
      const onUp = (ev: MouseEvent) => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        endDrag(ev.pageX, ev.pageY);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [beginDrag, clearHoldTimer, enabled, endDrag, instantDrag, moveDrag]
  );

  return { panHandlers: panResponder.panHandlers, bindWebMouse, armedRef };
}
