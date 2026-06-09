import { useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

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
  onActivate: () => void;
  onRemove: () => void;
};

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
  const tone = normalizeMemoTextBoxTone(box.tone);
  const surface = memoTextBoxSurface(tone);
  const boxRef = useRef(box);
  boxRef.current = box;

  const interactiveRef = useRef(interactive);
  const activeRef = useRef(active);
  interactiveRef.current = interactive;
  activeRef.current = active;

  const [dragDelta, setDragDelta] = useState({ dx: 0, dy: 0 });
  const [resizeLive, setResizeLive] = useState<{ w: number; h: number } | null>(null);

  const dragOrigin = useRef({ x: 0, y: 0 });
  const resizeOrigin = useRef({ w: 0, h: 0 });

  const clampPos = (x: number, y: number, w: number, h: number) => ({
    x: Math.max(0, Math.min(surfaceWidth - w, x)),
    y: Math.max(0, Math.min(surfaceHeight - h, y)),
  });

  const commitDrag = (dx: number, dy: number) => {
    const b = boxRef.current;
    const next = clampPos(dragOrigin.current.x + dx, dragOrigin.current.y + dy, b.width, b.height);
    onChange({ x: next.x, y: next.y });
    setDragDelta({ dx: 0, dy: 0 });
  };

  const commitResize = (dw: number, dh: number) => {
    const b = boxRef.current;
    const w = Math.max(72, Math.min(surfaceWidth - b.x, resizeOrigin.current.w + dw));
    const h = Math.max(32, Math.min(surfaceHeight - b.y, resizeOrigin.current.h + dh));
    onChange({ width: w, height: h });
    setResizeLive(null);
  };

  const canManipulate = () => interactiveRef.current && activeRef.current;

  const dragPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => canManipulate(),
      onStartShouldSetPanResponderCapture: () => canManipulate(),
      onMoveShouldSetPanResponder: () => canManipulate(),
      onMoveShouldSetPanResponderCapture: () => canManipulate(),
      onPanResponderGrant: () => {
        const b = boxRef.current;
        dragOrigin.current = { x: b.x, y: b.y };
        onActivate();
      },
      onPanResponderMove: (_, g) => {
        setDragDelta({ dx: g.dx, dy: g.dy });
      },
      onPanResponderRelease: (_, g) => commitDrag(g.dx, g.dy),
      onPanResponderTerminate: (_, g) => commitDrag(g.dx, g.dy),
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => canManipulate(),
    })
  ).current;

  const resizePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => canManipulate(),
      onStartShouldSetPanResponderCapture: () => canManipulate(),
      onMoveShouldSetPanResponder: () => canManipulate(),
      onMoveShouldSetPanResponderCapture: () => canManipulate(),
      onPanResponderGrant: () => {
        const b = boxRef.current;
        resizeOrigin.current = { w: b.width, h: b.height };
        onActivate();
      },
      onPanResponderMove: (_, g) => {
        const b = boxRef.current;
        const w = Math.max(72, Math.min(surfaceWidth - b.x, resizeOrigin.current.w + g.dx));
        const h = Math.max(32, Math.min(surfaceHeight - b.y, resizeOrigin.current.h + g.dy));
        setResizeLive({ w, h });
      },
      onPanResponderRelease: (_, g) => commitResize(g.dx, g.dy),
      onPanResponderTerminate: (_, g) => commitResize(g.dx, g.dy),
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => canManipulate(),
    })
  ).current;

  const showControls = active && interactive;
  const isEditing = active && editing;
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
        },
        isEditing ? styles.textBoxEditing : styles.textBoxIdle,
        active && !isEditing && styles.textBoxSelected,
      ]}
      pointerEvents={interactive ? 'auto' : 'none'}>
      {showControls ? (
        <View style={styles.textBoxHeader}>
          <View style={styles.dragHandle} {...dragPan.panHandlers}>
            <View style={[styles.dragGrip, { backgroundColor: surface.hintColor }]} />
          </View>
          <Pressable onPress={onRemove} hitSlop={8} style={styles.deleteChip}>
            <Text style={styles.deleteChipText}>×</Text>
          </Pressable>
        </View>
      ) : null}
      {isEditing ? (
        <TextInput
          style={[styles.textInput, { color: surface.textColor }]}
          multiline
          value={box.text}
          editable
          onChangeText={(text) => onChange({ text })}
          onFocus={onActivate}
          placeholder={placeholder}
          placeholderTextColor={surface.placeholderColor}
        />
      ) : (
        <Pressable
          style={styles.textBodyTap}
          onPress={onActivate}
          disabled={!interactive}>
          <Text
            style={[
              styles.textPreview,
              { color: box.text.trim() ? surface.textColor : surface.placeholderColor },
            ]}>
            {box.text.trim() ? box.text : placeholder}
          </Text>
        </Pressable>
      )}
      {showControls ? (
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
    zIndex: 4,
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
    marginBottom: 2,
    minHeight: 24,
    gap: 4,
  },
  dragHandle: {
    flex: 1,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragGrip: {
    width: 28,
    height: 3,
    borderRadius: 2,
    opacity: 0.45,
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
  textBodyTap: {
    flex: 1,
    minHeight: 24,
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
    width: 14,
    height: 14,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: theme.orange,
    marginRight: 2,
    marginBottom: 2,
  },
});
