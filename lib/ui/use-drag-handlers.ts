import { useCallback, useMemo, useRef } from 'react';
import { PanResponder, Platform, type GestureResponderEvent, type ViewStyle } from 'react-native';

type Options = {
  enabled?: boolean;
  onGrant?: () => void;
  onDrag: (dx: number, dy: number) => void;
  onEnd?: () => void;
};

const WEB_DRAG_STYLE: ViewStyle | undefined =
  Platform.OS === 'web'
    ? ({ touchAction: 'none', cursor: 'grab', userSelect: 'none' } as unknown as ViewStyle)
    : undefined;

export function useDragHandlers({ enabled = true, onGrant, onDrag, onEnd }: Options) {
  const enabledRef = useRef(enabled);
  const onGrantRef = useRef(onGrant);
  const onDragRef = useRef(onDrag);
  const onEndRef = useRef(onEnd);
  const grantRef = useRef({ pageX: 0, pageY: 0 });
  const activeRef = useRef(false);

  enabledRef.current = enabled;
  onGrantRef.current = onGrant;
  onDragRef.current = onDrag;
  onEndRef.current = onEnd;

  const finish = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    onEndRef.current?.();
  }, []);

  const move = useCallback((dx: number, dy: number) => {
    if (!enabledRef.current || !activeRef.current) return;
    onDragRef.current(dx, dy);
  }, []);

  const grant = useCallback((pageX: number, pageY: number) => {
    if (!enabledRef.current) return;
    onGrantRef.current?.();
    activeRef.current = true;
    grantRef.current = { pageX, pageY };
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => enabledRef.current,
        onMoveShouldSetPanResponder: () => enabledRef.current,
        onPanResponderGrant: (evt: GestureResponderEvent) => {
          const { pageX, pageY } = evt.nativeEvent;
          grant(pageX, pageY);
        },
        onPanResponderMove: (_, gesture) => {
          move(gesture.dx, gesture.dy);
        },
        onPanResponderRelease: finish,
        onPanResponderTerminate: finish,
      }),
    [finish, grant, move]
  );

  const onWebMouseDown = useCallback(
    (pageX: number, pageY: number) => {
      if (typeof document === 'undefined') return;
      grant(pageX, pageY);
      const onMove = (ev: MouseEvent) => {
        move(ev.pageX - grantRef.current.pageX, ev.pageY - grantRef.current.pageY);
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        finish();
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [finish, grant, move]
  );

  return {
    panHandlers: panResponder.panHandlers,
    onWebMouseDown: Platform.OS === 'web' ? onWebMouseDown : undefined,
    webStyle: WEB_DRAG_STYLE,
  };
}
