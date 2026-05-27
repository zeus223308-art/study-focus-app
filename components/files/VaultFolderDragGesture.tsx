import * as Haptics from 'expo-haptics';
import { useCallback, useRef } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import {
  LongPressGestureHandler,
  PanGestureHandler,
  State,
  type LongPressGestureHandlerStateChangeEvent,
  type PanGestureHandlerStateChangeEvent,
  type PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';

import { HOLD_DRAG_MS } from '@/lib/ui/hold-drag';

type Props = {
  enabled: boolean;
  onLift: (pageX: number, pageY: number) => void;
  onDragMove?: (pageX: number, pageY: number) => void;
  onDragEnd?: (moved: boolean, pageX: number, pageY: number) => void;
  onGestureActiveChange?: (active: boolean) => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Long-press then pan — works inside RNGH horizontal FlatList.
 */
export function VaultFolderDragGesture({
  enabled,
  onLift,
  onDragMove,
  onDragEnd,
  onGestureActiveChange,
  children,
  style,
}: Props) {
  const liftedRef = useRef(false);
  const movedRef = useRef(false);
  const propsRef = useRef({ onLift, onDragMove, onDragEnd, onGestureActiveChange });
  propsRef.current = { onLift, onDragMove, onDragEnd, onGestureActiveChange };

  const fireLift = useCallback((pageX: number, pageY: number) => {
    liftedRef.current = true;
    movedRef.current = false;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    propsRef.current.onGestureActiveChange?.(true);
    propsRef.current.onLift(pageX, pageY);
    propsRef.current.onDragMove?.(pageX, pageY);
  }, []);

  const fireMove = useCallback((pageX: number, pageY: number) => {
    movedRef.current = true;
    propsRef.current.onDragMove?.(pageX, pageY);
  }, []);

  const fireEnd = useCallback((pageX: number, pageY: number) => {
    const moved = movedRef.current;
    liftedRef.current = false;
    movedRef.current = false;
    propsRef.current.onGestureActiveChange?.(false);
    propsRef.current.onDragEnd?.(moved, pageX, pageY);
  }, []);

  const onLongPressStateChange = useCallback(
    (event: LongPressGestureHandlerStateChangeEvent) => {
      if (!enabled) return;
      if (event.nativeEvent.state !== State.ACTIVE) return;
      const { absoluteX, absoluteY } = event.nativeEvent;
      fireLift(absoluteX, absoluteY);
    },
    [enabled, fireLift]
  );

  const onPanGestureEvent = useCallback(
    (event: PanGestureHandlerGestureEvent) => {
      if (!liftedRef.current) return;
      const { absoluteX, absoluteY } = event.nativeEvent;
      fireMove(absoluteX, absoluteY);
    },
    [fireMove]
  );

  const onPanStateChange = useCallback(
    (event: PanGestureHandlerStateChangeEvent) => {
      if (!liftedRef.current) return;
      const { state, absoluteX, absoluteY } = event.nativeEvent;
      if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
        fireEnd(absoluteX, absoluteY);
      }
    },
    [fireEnd]
  );

  if (!enabled) {
    return <View style={style}>{children}</View>;
  }

  return (
    <LongPressGestureHandler
      minDurationMs={HOLD_DRAG_MS}
      maxDist={32}
      onHandlerStateChange={onLongPressStateChange}>
      <PanGestureHandler
        onGestureEvent={onPanGestureEvent}
        onHandlerStateChange={onPanStateChange}
        minDist={0}
        activeOffsetY={[-6, 6]}
        failOffsetX={[-32, 32]}>
        <View style={[style, styles.hit]} collapsable={false}>
          {children}
        </View>
      </PanGestureHandler>
    </LongPressGestureHandler>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: '100%',
  },
});
