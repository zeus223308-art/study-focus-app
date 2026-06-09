import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type GestureResponderEvent,
} from 'react-native';

import { theme } from '@/constants/theme';
import {
  memoTextBoxSurface,
  normalizeMemoTextBoxTone,
} from '@/lib/domain/memo-text-box-style';
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
  onSelect: () => void;
  onEdit: () => void;
  onRemove: () => void;
};

type DragKind = 'move' | 'resize';

type DragSession = {
  kind: DragKind;
  startPageX: number;
  startPageY: number;
  wasActive: boolean;
};

const TAP_SLOP_PX = 8;

function touchPoint(e: GestureResponderEvent): { pageX: number; pageY: number } | null {
  const ne = e.nativeEvent as {
    pageX?: number;
    pageY?: number;
    touches?: { pageX?: number; pageY?: number; clientX?: number; clientY?: number }[];
    changedTouches?: { pageX?: number; pageY?: number; clientX?: number; clientY?: number }[];
  };
  const t = ne.touches?.[0] ?? ne.changedTouches?.[0];
  if (t) {
    return {
      pageX: t.pageX ?? t.clientX ?? 0,
      pageY: t.pageY ?? t.clientY ?? 0,
    };
  }
  if (ne.pageX != null && ne.pageY != null) {
    return { pageX: ne.pageX, pageY: ne.pageY };
  }
  return null;
}

const MOVE_WEB_STYLE =
  Platform.OS === 'web' ? ({ touchAction: 'none', cursor: 'grab' } as object) : null;

export function MemoTextBoxView({
  box,
  active,
  editing,
  interactive,
  surfaceWidth,
  surfaceHeight,
  placeholder,
  onChange,
  onSelect,
  onEdit,
  onRemove,
}: Props) {
  const tone = normalizeMemoTextBoxTone(box.tone);
  const surface = memoTextBoxSurface(tone);
  const boxRef = useRef(box);
  boxRef.current = box;

  const interactiveRef = useRef(interactive);
  const activeRef = useRef(active);
  const editingRef = useRef(editing);
  interactiveRef.current = interactive;
  activeRef.current = active;
  editingRef.current = editing;

  const onSelectRef = useRef(onSelect);
  const onEditRef = useRef(onEdit);
  const onChangeRef = useRef(onChange);
  onSelectRef.current = onSelect;
  onEditRef.current = onEdit;
  onChangeRef.current = onChange;

  const [dragDelta, setDragDelta] = useState({ dx: 0, dy: 0 });
  const [resizeLive, setResizeLive] = useState<{ w: number; h: number } | null>(null);

  const dragOrigin = useRef({ x: 0, y: 0 });
  const resizeOrigin = useRef({ w: 0, h: 0 });
  const sessionRef = useRef<DragSession | null>(null);

  const clampPos = useCallback((x: number, y: number, w: number, h: number) => ({
    x: Math.max(0, Math.min(surfaceWidth - w, x)),
    y: Math.max(0, Math.min(surfaceHeight - h, y)),
  }), [surfaceHeight, surfaceWidth]);

  const applyMove = useCallback((dx: number, dy: number) => {
    setDragDelta({ dx, dy });
  }, []);

  const applyResize = useCallback((dw: number, dh: number) => {
    const b = boxRef.current;
    const w = Math.max(72, Math.min(surfaceWidth - b.x, resizeOrigin.current.w + dw));
    const h = Math.max(32, Math.min(surfaceHeight - b.y, resizeOrigin.current.h + dh));
    setResizeLive({ w, h });
  }, [surfaceHeight, surfaceWidth]);

  const commitMove = useCallback((dx: number, dy: number) => {
    const b = boxRef.current;
    const next = clampPos(dragOrigin.current.x + dx, dragOrigin.current.y + dy, b.width, b.height);
    onChangeRef.current({ x: next.x, y: next.y });
    setDragDelta({ dx: 0, dy: 0 });
  }, [clampPos]);

  const commitResize = useCallback((dw: number, dh: number) => {
    const b = boxRef.current;
    const w = Math.max(72, Math.min(surfaceWidth - b.x, resizeOrigin.current.w + dw));
    const h = Math.max(32, Math.min(surfaceHeight - b.y, resizeOrigin.current.h + dh));
    onChangeRef.current({ width: w, height: h });
    setResizeLive(null);
  }, [surfaceHeight, surfaceWidth]);

  const pointerMove = useCallback((pageX: number, pageY: number) => {
    const s = sessionRef.current;
    if (!s) return;
    const dx = pageX - s.startPageX;
    const dy = pageY - s.startPageY;
    if (s.kind === 'move') applyMove(dx, dy);
    else applyResize(dx, dy);
  }, [applyMove, applyResize]);

  const pointerEnd = useCallback((pageX: number, pageY: number) => {
    const s = sessionRef.current;
    if (!s) return;
    const dx = pageX - s.startPageX;
    const dy = pageY - s.startPageY;
    if (s.kind === 'move') {
      if (Math.abs(dx) < TAP_SLOP_PX && Math.abs(dy) < TAP_SLOP_PX) {
        setDragDelta({ dx: 0, dy: 0 });
        if (!s.wasActive) onSelectRef.current();
        else if (!editingRef.current) onEditRef.current();
      } else {
        if (!s.wasActive) onSelectRef.current();
        commitMove(dx, dy);
      }
    } else {
      commitResize(dx, dy);
    }
    sessionRef.current = null;
  }, [commitMove, commitResize]);

  const startDrag = useCallback((kind: DragKind, pageX: number, pageY: number) => {
    if (!interactiveRef.current) return;
    const b = boxRef.current;
    if (kind === 'move') {
      dragOrigin.current = { x: b.x, y: b.y };
    } else {
      resizeOrigin.current = { w: b.width, h: b.height };
    }
    sessionRef.current = {
      kind,
      startPageX: pageX,
      startPageY: pageY,
      wasActive: activeRef.current,
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onMouseMove = (e: MouseEvent) => {
      if (!sessionRef.current) return;
      pointerMove(e.pageX, e.pageY);
    };
    const onMouseUp = (e: MouseEvent) => {
      if (!sessionRef.current) return;
      pointerEnd(e.pageX, e.pageY);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [pointerEnd, pointerMove]);

  const bindDrag = (kind: DragKind) => ({
    onStartShouldSetResponder: () => interactiveRef.current,
    onMoveShouldSetResponder: () => Boolean(sessionRef.current),
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e: GestureResponderEvent) => {
      const p = touchPoint(e);
      if (!p) return;
      startDrag(kind, p.pageX, p.pageY);
    },
    onResponderMove: (e: GestureResponderEvent) => {
      const p = touchPoint(e);
      if (!p) return;
      pointerMove(p.pageX, p.pageY);
    },
    onResponderRelease: (e: GestureResponderEvent) => {
      const p = touchPoint(e);
      if (!p) return;
      pointerEnd(p.pageX, p.pageY);
    },
    onResponderTerminate: (e: GestureResponderEvent) => {
      const p = touchPoint(e);
      if (!p) return;
      pointerEnd(p.pageX, p.pageY);
    },
    ...(Platform.OS === 'web'
      ? {
          onMouseDown: (e: { pageX?: number; pageY?: number; preventDefault?: () => void }) => {
            if (!interactiveRef.current) return;
            e.preventDefault?.();
            startDrag(kind, e.pageX ?? 0, e.pageY ?? 0);
          },
        }
      : null),
  });

  const showControls = active && interactive;
  const isEditing = active && editing;
  const canMove = interactive && !isEditing;
  const width = resizeLive?.w ?? box.width;
  const height = resizeLive?.h ?? box.height;

  return (
    <View
      style={[
        styles.textBox,
        {
          left: box.x,
          top: box.y,
          width,
          height,
          backgroundColor: surface.backgroundColor,
          transform: [{ translateX: dragDelta.dx }, { translateY: dragDelta.dy }],
          zIndex: active ? 6 : 4,
        },
        isEditing ? styles.textBoxEditing : styles.textBoxIdle,
        active && !isEditing && styles.textBoxSelected,
        canMove && MOVE_WEB_STYLE,
      ]}
      pointerEvents={interactive ? 'auto' : 'none'}
      accessibilityRole="adjustable"
      {...(canMove ? bindDrag('move') : null)}>
      {showControls ? (
        <View
          onStartShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          style={styles.deleteWrap}>
          <Pressable
            onPress={onRemove}
            hitSlop={8}
            style={styles.deleteChip}
            accessibilityRole="button"
            accessibilityLabel="Remove text box">
            <Text style={styles.deleteChipText}>×</Text>
          </Pressable>
        </View>
      ) : null}
      {isEditing ? (
        <TextInput
          style={[styles.textInput, showControls && styles.textInputWithDelete, { color: surface.textColor }]}
          multiline
          value={box.text}
          editable
          onChangeText={(text) => onChange({ text })}
          onFocus={onEdit}
          placeholder={placeholder}
          placeholderTextColor={surface.placeholderColor}
        />
      ) : (
        <View style={[styles.textBody, showControls && styles.textBodyWithDelete]} pointerEvents="none">
          <Text
            style={[
              styles.textPreview,
              { color: box.text.trim() ? surface.textColor : surface.placeholderColor },
            ]}>
            {box.text.trim() ? box.text : placeholder}
          </Text>
        </View>
      )}
      {showControls ? (
        <View
          style={[styles.resizeHandle, MOVE_WEB_STYLE]}
          accessibilityRole="adjustable"
          {...bindDrag('resize')}>
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
    padding: 6,
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
  deleteWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 3,
  },
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
  textInputWithDelete: {
    paddingTop: 2,
    paddingRight: 24,
  },
  textBody: {
    flex: 1,
    minHeight: 24,
  },
  textBodyWithDelete: {
    paddingRight: 22,
  },
  textPreview: {
    fontSize: 14,
    textAlignVertical: 'top',
    opacity: 0.92,
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
    width: 12,
    height: 12,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: theme.orange,
    marginRight: 1,
    marginBottom: 1,
    opacity: 0.7,
  },
});
