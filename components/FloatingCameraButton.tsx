import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Platform,
  StyleSheet,
  View,
  type LayoutRectangle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';

const BTN_SIZE = 52;
const EDGE_MARGIN = 16;
const DRAG_THRESHOLD = 6;
const IS_WEB = Platform.OS === 'web';

const SPRING = { damping: 22, stiffness: 280, mass: 0.85 };

type Bounds = { width: number; height: number };

function clampPosition(x: number, y: number, bounds: Bounds) {
  const maxX = Math.max(0, bounds.width - BTN_SIZE);
  const maxY = Math.max(0, bounds.height - BTN_SIZE);
  return {
    x: Math.max(0, Math.min(x, maxX)),
    y: Math.max(0, Math.min(y, maxY)),
  };
}

export function FloatingCameraButton() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const boundsRef = useRef<Bounds>({ width: 0, height: 0 });
  const positionedRef = useRef(false);
  const dragOriginRef = useRef({ x: 0, y: 0, pageX: 0, pageY: 0 });
  const didDragRef = useRef(false);
  const pointerDragRef = useRef({ active: false, startPageX: 0, startPageY: 0 });

  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const [ready, setReady] = useState(false);

  const placeDefault = useCallback(
    (bounds: Bounds) => {
      const target = clampPosition(
        bounds.width - BTN_SIZE - EDGE_MARGIN - insets.right,
        insets.top + EDGE_MARGIN,
        bounds
      );
      x.value = target.x;
      y.value = target.y;
      setReady(true);
    },
    [insets.right, insets.top, x, y]
  );

  const applyPosition = useCallback(
    (nextX: number, nextY: number, spring: boolean) => {
      const clamped = clampPosition(nextX, nextY, boundsRef.current);
      if (spring) {
        x.value = withSpring(clamped.x, SPRING);
        y.value = withSpring(clamped.y, SPRING);
      } else {
        x.value = clamped.x;
        y.value = clamped.y;
      }
    },
    [x, y]
  );

  const onLayout = useCallback(
    (layout: LayoutRectangle) => {
      const bounds = { width: layout.width, height: layout.height };
      boundsRef.current = bounds;
      if (!positionedRef.current && bounds.width > 0 && bounds.height > 0) {
        positionedRef.current = true;
        placeDefault(bounds);
      }
    },
    [placeDefault]
  );

  const openCamera = useCallback(() => {
    router.push('/(tabs)/capture');
  }, [router]);

  const endDrag = useCallback(() => {
    if (!pointerDragRef.current.active) return;
    pointerDragRef.current.active = false;
    applyPosition(x.value, y.value, true);
    if (!didDragRef.current) {
      openCamera();
    }
    didDragRef.current = false;
  }, [applyPosition, openCamera, x, y]);

  const moveDrag = useCallback(
    (pageX: number, pageY: number) => {
      if (!pointerDragRef.current.active) return;
      const dx = pageX - pointerDragRef.current.startPageX;
      const dy = pageY - pointerDragRef.current.startPageY;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        didDragRef.current = true;
      }
      applyPosition(dragOriginRef.current.x + dx, dragOriginRef.current.y + dy, false);
    },
    [applyPosition]
  );

  const startDrag = useCallback(
    (pageX: number, pageY: number) => {
      didDragRef.current = false;
      dragOriginRef.current = { x: x.value, y: y.value, pageX, pageY };
      pointerDragRef.current = {
        active: true,
        startPageX: pageX,
        startPageY: pageY,
      };
    },
    [x, y]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (evt) => {
          const { pageX, pageY } = evt.nativeEvent;
          startDrag(pageX, pageY);
        },
        onPanResponderMove: (evt) => {
          const { pageX, pageY } = evt.nativeEvent;
          moveDrag(pageX, pageY);
        },
        onPanResponderRelease: endDrag,
        onPanResponderTerminate: endDrag,
      }),
    [endDrag, moveDrag, startDrag]
  );

  const bindWebMouseDrag = useCallback(
    (pageX: number, pageY: number) => {
      if (typeof document === 'undefined') return;
      startDrag(pageX, pageY);
      const onMove = (ev: MouseEvent) => moveDrag(ev.pageX, ev.pageY);
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        endDrag();
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [endDrag, moveDrag, startDrag]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  if (!ready) {
    return (
      <View
        style={styles.overlay}
        pointerEvents="box-none"
        onLayout={(e) => onLayout(e.nativeEvent.layout)}
      />
    );
  }

  return (
    <View
      style={styles.overlay}
      pointerEvents="box-none"
      onLayout={(e) => onLayout(e.nativeEvent.layout)}>
      <Animated.View
        style={[styles.fab, animatedStyle]}
        {...(!IS_WEB ? panResponder.panHandlers : {})}
        {...(IS_WEB
          ? {
              onMouseDown: (e: { button?: number; nativeEvent: { pageX: number; pageY: number } }) => {
                if (e.button !== undefined && e.button !== 0) return;
                bindWebMouseDrag(e.nativeEvent.pageX, e.nativeEvent.pageY);
              },
              onTouchStart: (e: { nativeEvent: { touches: { pageX: number; pageY: number }[] } }) => {
                const t = e.nativeEvent.touches[0];
                if (t) startDrag(t.pageX, t.pageY);
              },
              onTouchMove: (e: { nativeEvent: { touches: { pageX: number; pageY: number }[] } }) => {
                const t = e.nativeEvent.touches[0];
                if (t) moveDrag(t.pageX, t.pageY);
              },
              onTouchEnd: endDrag,
              onTouchCancel: endDrag,
            }
          : {})}>
        <SymbolView
          name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }}
          size={32}
          tintColor={theme.orange}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    elevation: 100,
  },
  fab: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: BTN_SIZE,
    height: BTN_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    ...Platform.select({
      web: { cursor: 'grab' } as object,
      default: {},
    }),
  },
});
