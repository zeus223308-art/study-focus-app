import { useCallback, useRef } from 'react';
import {
  type GestureResponderEvent,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { HOLD_DRAG_MS } from '@/lib/ui/hold-drag';

export { HOLD_DRAG_MS };

const MOVE_CANCEL_PX = 12;
const TAP_SLOP_PX = 14;
/** Gap between first tap release and second touch for delete (ms). */
const DELETE_PAIR_MS = 420;
/** Defer open slightly so a quick second touch can start delete instead. */
const OPEN_DEFER_MS = 120;

type Props = {
  enabled: boolean;
  onLift: () => void;
  onDragMove?: (pageX: number, pageY: number) => void;
  onDragEnd?: (moved: boolean, pageX: number, pageY: number) => void;
  onPress?: () => void;
  /** Long-press menu (e.g. send to new folder) — takes priority over onLift. */
  onHoldMenu?: () => void;
  /** First tap, then second touch + hold within ~0.4s → delete (no selection UI). */
  onDeleteHold?: () => void;
  onGestureActiveChange?: (active: boolean) => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

type Point = { pageX: number; pageY: number };

/**
 * Touch long-press + drag (native iOS/Android + mobile web).
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
  const phaseRef = useRef<'idle' | 'pending' | 'lifted'>('idle');
  const movedRef = useRef(false);
  const startRef = useRef<Point>({ pageX: 0, pageY: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openDeferRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deleteHoldRef = useRef(false);
  const lastReleaseAtRef = useRef(0);

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

  const setActive = useCallback(
    (active: boolean) => {
      onGestureActiveChange?.(active);
    },
    [onGestureActiveChange]
  );

  const scheduleOpen = useCallback(() => {
    if (!onPress) return;
    if (!onDeleteHold) {
      onPress();
      return;
    }
    clearOpenDefer();
    openDeferRef.current = setTimeout(() => {
      openDeferRef.current = null;
      onPress();
    }, OPEN_DEFER_MS);
  }, [clearOpenDefer, onDeleteHold, onPress]);

  const finish = useCallback(
    (pageX: number, pageY: number) => {
      clearTimer();
      const phase = phaseRef.current;
      const moved = movedRef.current;
      phaseRef.current = 'idle';
      movedRef.current = false;
      deleteHoldRef.current = false;
      setActive(false);

      if (phase === 'lifted') {
        onDragEnd?.(moved, pageX, pageY);
        return;
      }
      if (phase !== 'pending') return;

      const dx = Math.abs(pageX - startRef.current.pageX);
      const dy = Math.abs(pageY - startRef.current.pageY);
      if (dx >= TAP_SLOP_PX || dy >= TAP_SLOP_PX) return;

      lastReleaseAtRef.current = Date.now();
      scheduleOpen();
    },
    [clearTimer, onDragEnd, scheduleOpen, setActive]
  );

  const beginLift = useCallback(
    (pageX: number, pageY: number) => {
      if (phaseRef.current !== 'pending') return;

      if (deleteHoldRef.current && onDeleteHold) {
        phaseRef.current = 'idle';
        clearTimer();
        clearOpenDefer();
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        onDeleteHold();
        return;
      }

      if (onHoldMenu) {
        phaseRef.current = 'idle';
        clearTimer();
        clearOpenDefer();
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onHoldMenu();
        return;
      }

      phaseRef.current = 'lifted';
      movedRef.current = false;
      setActive(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onLift();
      onDragMove?.(pageX, pageY);
    },
    [clearOpenDefer, clearTimer, onDeleteHold, onDragMove, onHoldMenu, onLift, setActive]
  );

  const scheduleLift = useCallback(
    (pageX: number, pageY: number) => {
      clearTimer();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        beginLift(pageX, pageY);
      }, HOLD_DRAG_MS);
    },
    [beginLift, clearTimer]
  );

  const startPending = useCallback(
    (pageX: number, pageY: number) => {
      if (!enabled) return;
      clearTimer();
      phaseRef.current = 'pending';
      movedRef.current = false;
      startRef.current = { pageX, pageY };

      const sinceRelease = Date.now() - lastReleaseAtRef.current;
      if (
        onDeleteHold &&
        lastReleaseAtRef.current > 0 &&
        sinceRelease < DELETE_PAIR_MS
      ) {
        clearOpenDefer();
        deleteHoldRef.current = true;
      } else {
        deleteHoldRef.current = false;
      }

      scheduleLift(pageX, pageY);
    },
    [clearOpenDefer, enabled, onDeleteHold, scheduleLift]
  );

  const movePendingOrDrag = useCallback(
    (pageX: number, pageY: number) => {
      if (phaseRef.current === 'lifted') {
        movedRef.current = true;
        onDragMove?.(pageX, pageY);
        return;
      }
      if (phaseRef.current !== 'pending' || !timerRef.current) return;
      const dx = Math.abs(pageX - startRef.current.pageX);
      const dy = Math.abs(pageY - startRef.current.pageY);
      // Cancel only on mostly-horizontal movement so vertical scroll does not block lift.
      if (dx > MOVE_CANCEL_PX && dx > dy) {
        clearTimer();
        phaseRef.current = 'idle';
        deleteHoldRef.current = false;
      }
    },
    [clearTimer, onDragMove]
  );

  const touchPoint = (e: GestureResponderEvent): Point | null => {
    const t = e.nativeEvent.touches?.[0] ?? e.nativeEvent.changedTouches?.[0];
    if (!t) return null;
    return { pageX: t.pageX, pageY: t.pageY };
  };

  const onTouchStart = useCallback(
    (e: GestureResponderEvent) => {
      const p = touchPoint(e);
      if (!p) return;
      startPending(p.pageX, p.pageY);
    },
    [startPending]
  );

  const onTouchMove = useCallback(
    (e: GestureResponderEvent) => {
      const p = touchPoint(e);
      if (!p) return;
      if (phaseRef.current === 'lifted') {
        e.preventDefault?.();
      }
      movePendingOrDrag(p.pageX, p.pageY);
    },
    [movePendingOrDrag]
  );

  const onTouchEnd = useCallback(
    (e: GestureResponderEvent) => {
      const p = touchPoint(e);
      if (!p) return;
      finish(p.pageX, p.pageY);
    },
    [finish]
  );

  return (
    <View style={[style, styles.surface]} collapsable={false}>
      <View
        style={styles.touchTarget}
        onTouchStart={enabled ? onTouchStart : undefined}
        onTouchMove={enabled ? onTouchMove : undefined}
        onTouchEnd={enabled ? onTouchEnd : undefined}
        onTouchCancel={enabled ? onTouchEnd : undefined}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    width: '100%',
  },
  touchTarget: {
    width: '100%',
  },
});
