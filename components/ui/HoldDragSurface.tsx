import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  PanResponder,
  type GestureResponderEvent,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

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

export { HOLD_DRAG_MS };

const MOVE_CANCEL_PX = 12;
const TAP_SLOP_PX = 14;
const DELETE_PAIR_MS = 420;
const OPEN_DEFER_MS = 120;

type Props = {
  enabled: boolean;
  onLift: () => void;
  onDragMove?: (pageX: number, pageY: number) => void;
  onDragEnd?: (moved: boolean, pageX: number, pageY: number) => void;
  onPress?: () => void;
  onDeleteHold?: () => void;
  /** Long press without moving → onDeleteHold (subjects). Default: tap then hold. */
  deleteOnStillHold?: boolean;
  onHoldMenu?: () => void;
  /** After 2 taps, 3rd touch + hold → merge drag (not reorder). */
  onMergeHold?: () => void;
  onGestureActiveChange?: (active: boolean) => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

type Point = { pageX: number; pageY: number };

function eventPoint(e: GestureResponderEvent): Point {
  const ne = e.nativeEvent;
  return { pageX: ne.pageX, pageY: ne.pageY };
}

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
  const phaseRef = useRef<'idle' | 'pending' | 'lifted'>('idle');
  const movedRef = useRef(false);
  const startRef = useRef<Point>({ pageX: 0, pageY: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openDeferRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const enabledRef = useRef(enabled);
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

  const setActive = useCallback((active: boolean) => {
    onGestureActiveChangeRef.current?.(active);
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
      const phase = phaseRef.current;
      const moved = movedRef.current;
      phaseRef.current = 'idle';
      movedRef.current = false;
      deleteHoldRef.current = false;
      dragIntentRef.current = false;
      mergeHoldRef.current = false;
      setActive(false);

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
    [clearOpenDefer, clearTimer, mergeTapRefs, scheduleOpen, setActive]
  );

  const beginLift = useCallback(
    (pageX: number, pageY: number) => {
      if (phaseRef.current !== 'pending') return;

      if (deleteHoldRef.current && onDeleteHoldRef.current) {
        phaseRef.current = 'idle';
        clearTimer();
        clearOpenDefer();
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        onDeleteHoldRef.current();
        return;
      }

      if (mergeHoldRef.current && onMergeHoldRef.current) {
        phaseRef.current = 'lifted';
        movedRef.current = false;
        clearMergeTapState(mergeTapRefs);
        setActive(true);
        clearOpenDefer();
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onMergeHoldRef.current();
        onDragMoveRef.current?.(pageX, pageY);
        return;
      }

      if (onHoldMenuRef.current) {
        phaseRef.current = 'idle';
        clearTimer();
        clearOpenDefer();
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        onDeleteHoldRef.current();
        return;
      }

      phaseRef.current = 'lifted';
      movedRef.current = false;
      setActive(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onLiftRef.current();
      onDragMoveRef.current?.(pageX, pageY);
    },
    [clearOpenDefer, clearTimer, setActive]
  );

  const scheduleLift = useCallback(
    (pageX: number, pageY: number, delayOverride?: number) => {
      clearTimer();
      const delay =
        delayOverride ??
        (mergeHoldRef.current
          ? MERGE_HOLD_DRAG_MS
          : deleteOnStillHoldRef.current
            ? DELETE_STILL_HOLD_MS
            : HOLD_DRAG_MS);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        beginLift(pageX, pageY);
      }, delay);
    },
    [beginLift, clearTimer]
  );

  const startPending = useCallback(
    (pageX: number, pageY: number) => {
      if (!enabledRef.current) return;
      clearTimer();
      phaseRef.current = 'pending';
      movedRef.current = false;
      dragIntentRef.current = false;
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

      scheduleLift(pageX, pageY);
    },
    [clearOpenDefer, scheduleLift]
  );

  const movePendingOrDrag = useCallback(
    (pageX: number, pageY: number) => {
      if (phaseRef.current === 'lifted') {
        movedRef.current = true;
        onDragMoveRef.current?.(pageX, pageY);
        return;
      }
      if (phaseRef.current !== 'pending') return;
      if (mergeHoldRef.current) return;
      const dx = Math.abs(pageX - startRef.current.pageX);
      const dy = Math.abs(pageY - startRef.current.pageY);
      if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) {
        if (deleteOnStillHoldRef.current) {
          if (!dragIntentRef.current) {
            dragIntentRef.current = true;
            scheduleLift(pageX, pageY, HOLD_DRAG_MS);
          }
          return;
        }
        clearTimer();
        phaseRef.current = 'idle';
        deleteHoldRef.current = false;
      }
    },
    [clearTimer, scheduleLift]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => enabledRef.current,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: () =>
          enabledRef.current &&
          (phaseRef.current === 'lifted' ||
            phaseRef.current === 'pending' ||
            mergeHoldRef.current),
        onMoveShouldSetPanResponderCapture: () =>
          phaseRef.current === 'lifted' || mergeHoldRef.current,
        onPanResponderTerminationRequest: () => phaseRef.current !== 'lifted',
        onPanResponderGrant: (e) => {
          const p = eventPoint(e);
          startPending(p.pageX, p.pageY);
        },
        onPanResponderMove: (e) => {
          const p = eventPoint(e);
          movePendingOrDrag(p.pageX, p.pageY);
        },
        onPanResponderRelease: (e) => {
          const p = eventPoint(e);
          finish(p.pageX, p.pageY);
        },
        onPanResponderTerminate: (e) => {
          const p = eventPoint(e);
          finish(p.pageX, p.pageY);
        },
      }),
    [finish, movePendingOrDrag, startPending]
  );

  useEffect(
    () => () => {
      clearTimer();
      clearOpenDefer();
    },
    [clearOpenDefer, clearTimer]
  );

  return (
    <View
      style={[style, styles.surface]}
      collapsable={false}
      {...(enabled ? panResponder.panHandlers : {})}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    width: '100%',
  },
});
