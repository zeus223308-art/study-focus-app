import { useEffect, useRef, useState } from 'react';
import {
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type GestureResponderEvent,
  type ViewStyle,
} from 'react-native';

import { theme } from '@/constants/theme';
import { memoTextBoxSurface } from '@/lib/domain/memo-text-box-style';
import type { MemoTextBox } from '@/lib/domain/types';

export type { MemoTextBox };

type Props = {
  box: MemoTextBox;
  active: boolean;
  editing: boolean;
  interactive: boolean;
  surfaceWidth: number;
  surfaceHeight: number;
  placeholder: string;
  onChange: (patch: Partial<MemoTextBox>) => void;
  onActivate: () => void;
  onRemove: () => void;
};

const DRAG_ZONE_WEB: ViewStyle =
  Platform.OS === 'web'
    ? ({ touchAction: 'none', cursor: 'grab', userSelect: 'none' } as object)
    : {};

export function MemoTextBoxView({
  box,
  active,
  editing,
  interactive,
  surfaceWidth,
  surfaceHeight,
  placeholder,
  onChange,
  onActivate,
  onRemove,
}: Props) {
  const surface = memoTextBoxSurface();
  const [livePos, setLivePos] = useState<{ x: number; y: number } | null>(null);
  const [liveSize, setLiveSize] = useState<{ width: number; height: number } | null>(null);

  const boxRef = useRef(box);
  const surfaceRef = useRef({ width: surfaceWidth, height: surfaceHeight });
  const flagsRef = useRef({ interactive, active, editing });
  const dragOrigin = useRef({ x: 0, y: 0 });
  const resizeOrigin = useRef({ w: 0, h: 0 });
  const livePosRef = useRef<{ x: number; y: number } | null>(null);
  const liveSizeRef = useRef<{ width: number; height: number } | null>(null);
  const draggingRef = useRef(false);
  const touchStartRef = useRef({ pageX: 0, pageY: 0 });

  boxRef.current = box;
  surfaceRef.current = { width: surfaceWidth, height: surfaceHeight };
  flagsRef.current = { interactive, active, editing };

  useEffect(() => {
    livePosRef.current = null;
    liveSizeRef.current = null;
    draggingRef.current = false;
    setLivePos(null);
    setLiveSize(null);
  }, [box.id]);

  const posX = livePos?.x ?? box.x;
  const posY = livePos?.y ?? box.y;
  const boxW = liveSize?.width ?? box.width;
  const boxH = liveSize?.height ?? box.height;

  const canDrag = () => {
    const f = flagsRef.current;
    return f.interactive && f.active && f.editing;
  };

  const clampPos = (x: number, y: number, w: number, h: number) => {
    const sw = surfaceRef.current.width;
    const sh = surfaceRef.current.height;
    return {
      x: Math.max(0, Math.min(sw - w, x)),
      y: Math.max(0, Math.min(sh - h, y)),
    };
  };

  const applyDragDelta = (dx: number, dy: number) => {
    const b = boxRef.current;
    const size = liveSizeRef.current;
    const w = size?.width ?? b.width;
    const h = size?.height ?? b.height;
    const next = clampPos(dragOrigin.current.x + dx, dragOrigin.current.y + dy, w, h);
    livePosRef.current = next;
    setLivePos(next);
  };

  const commitDrag = () => {
    const cur = livePosRef.current;
    if (cur) onChange({ x: cur.x, y: cur.y });
    livePosRef.current = null;
    draggingRef.current = false;
    setLivePos(null);
  };

  const onDragTouchStart = (e: GestureResponderEvent) => {
    if (!canDrag()) return;
    const t = e.nativeEvent.touches[0];
    if (!t) return;
    const b = boxRef.current;
    dragOrigin.current = { x: b.x, y: b.y };
    touchStartRef.current = { pageX: t.pageX, pageY: t.pageY };
    draggingRef.current = true;
    onActivate();
  };

  const onDragTouchMove = (e: GestureResponderEvent) => {
    if (!draggingRef.current) return;
    const t = e.nativeEvent.touches[0];
    if (!t) return;
    applyDragDelta(t.pageX - touchStartRef.current.pageX, t.pageY - touchStartRef.current.pageY);
  };

  const onDragTouchEnd = () => {
    if (!draggingRef.current) return;
    commitDrag();
  };

  const dragPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => canDrag(),
      onStartShouldSetPanResponderCapture: () => canDrag(),
      onMoveShouldSetPanResponder: () => draggingRef.current || canDrag(),
      onMoveShouldSetPanResponderCapture: () => draggingRef.current,
      onPanResponderGrant: () => {
        const b = boxRef.current;
        dragOrigin.current = { x: b.x, y: b.y };
        draggingRef.current = true;
        onActivate();
      },
      onPanResponderMove: (_, g) => {
        if (!draggingRef.current) return;
        applyDragDelta(g.dx, g.dy);
      },
      onPanResponderRelease: () => commitDrag(),
      onPanResponderTerminate: () => {
        draggingRef.current = false;
        livePosRef.current = null;
        setLivePos(null);
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    })
  ).current;

  const resizePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => canDrag(),
      onStartShouldSetPanResponderCapture: () => canDrag(),
      onMoveShouldSetPanResponder: () => canDrag(),
      onPanResponderGrant: () => {
        const b = boxRef.current;
        resizeOrigin.current = { w: b.width, h: b.height };
        onActivate();
      },
      onPanResponderMove: (_, g) => {
        const b = boxRef.current;
        const sw = surfaceRef.current.width;
        const sh = surfaceRef.current.height;
        const w = Math.max(72, Math.min(sw - b.x, resizeOrigin.current.w + g.dx));
        const h = Math.max(32, Math.min(sh - b.y, resizeOrigin.current.h + g.dy));
        const next = { width: w, height: h };
        liveSizeRef.current = next;
        setLiveSize(next);
      },
      onPanResponderRelease: () => {
        const cur = liveSizeRef.current;
        if (cur) onChange({ width: cur.width, height: cur.height });
        liveSizeRef.current = null;
        setLiveSize(null);
      },
      onPanResponderTerminate: () => {
        liveSizeRef.current = null;
        setLiveSize(null);
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    })
  ).current;

  const showChrome = active && editing;

  return (
    <View
      style={[
        styles.textBox,
        {
          left: posX,
          top: posY,
          width: boxW,
          height: boxH,
          backgroundColor: surface.backgroundColor,
          zIndex: showChrome ? 8 : 4,
        },
        showChrome ? styles.textBoxEditing : styles.textBoxIdle,
        active && !editing && styles.textBoxSelected,
      ]}
      pointerEvents={interactive ? 'auto' : 'none'}>
      <View style={styles.textBoxHeader}>
        {showChrome ? (
          <View
            style={[styles.dragZone, DRAG_ZONE_WEB]}
            onTouchStart={onDragTouchStart}
            onTouchMove={onDragTouchMove}
            onTouchEnd={onDragTouchEnd}
            onTouchCancel={onDragTouchEnd}
            {...dragPan.panHandlers}
            accessibilityRole="adjustable"
            accessibilityLabel="Move text box">
            <Text style={[styles.dragHint, { color: surface.hintColor }]}>⋯</Text>
          </View>
        ) : null}
        {showChrome ? (
          <Pressable onPress={onRemove} hitSlop={8} style={styles.deleteChip}>
            <Text style={styles.deleteChipText}>×</Text>
          </Pressable>
        ) : null}
      </View>
      <TextInput
        style={[styles.textInput, { color: surface.textColor }]}
        multiline
        value={box.text}
        editable={showChrome}
        onChangeText={(text) => onChange({ text })}
        onFocus={onActivate}
        placeholder={placeholder}
        placeholderTextColor={surface.placeholderColor}
      />
      {showChrome ? (
        <View style={styles.resizeHandle} {...resizePan.panHandlers}>
          <View style={styles.resizeCorner} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  textBox: {
    position: 'absolute',
    borderRadius: 6,
    padding: 4,
  },
  textBoxEditing: {
    borderWidth: 2,
    borderColor: theme.orange,
  },
  textBoxIdle: {
    borderWidth: 0,
  },
  textBoxSelected: {
    borderWidth: 1,
    borderColor: theme.orange,
    borderStyle: 'dashed',
  },
  textBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
    minHeight: 28,
    gap: 4,
  },
  dragZone: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 28,
    paddingRight: 8,
  },
  dragHint: { fontWeight: '800', fontSize: 16, lineHeight: 18, paddingHorizontal: 2 },
  deleteChip: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteChipText: { color: theme.onAccent, fontWeight: '800', fontSize: 14, lineHeight: 16 },
  textInput: {
    flex: 1,
    fontSize: 14,
    textAlignVertical: 'top',
    padding: 0,
    backgroundColor: 'transparent',
  },
  resizeHandle: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  resizeCorner: {
    width: 14,
    height: 14,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: theme.orange,
    marginRight: 2,
    marginBottom: 2,
  },
});
