import { useEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { theme } from '@/constants/theme';
import {
  memoTextBoxSurface,
  normalizeMemoTextBoxTone,
} from '@/lib/domain/memo-text-box-style';
import type { MemoTextBox, MemoTextBoxTone } from '@/lib/domain/types';

export type { MemoTextBox };

type Props = {
  box: MemoTextBox;
  active: boolean;
  editing: boolean;
  interactive: boolean;
  surfaceWidth: number;
  surfaceHeight: number;
  placeholder: string;
  toneLightLabel: string;
  toneDarkLabel: string;
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
  toneLightLabel,
  toneDarkLabel,
  onChange,
  onActivate,
  onRemove,
}: Props) {
  const tone = normalizeMemoTextBoxTone(box.tone);
  const surface = memoTextBoxSurface(tone);
  const boxRef = useRef(box);
  boxRef.current = box;

  const [toneMenuOpen, setToneMenuOpen] = useState(false);
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

  const dragPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => interactive && active,
      onStartShouldSetPanResponderCapture: () => interactive && active,
      onMoveShouldSetPanResponder: () => interactive && active,
      onMoveShouldSetPanResponderCapture: () => interactive && active,
      onPanResponderGrant: () => {
        const b = boxRef.current;
        dragOrigin.current = { x: b.x, y: b.y };
        setToneMenuOpen(false);
        onActivate();
      },
      onPanResponderMove: (_, g) => {
        setDragDelta({ dx: g.dx, dy: g.dy });
      },
      onPanResponderRelease: (_, g) => commitDrag(g.dx, g.dy),
      onPanResponderTerminate: (_, g) => commitDrag(g.dx, g.dy),
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => interactive && active,
    })
  ).current;

  const resizePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => interactive && active,
      onStartShouldSetPanResponderCapture: () => interactive && active,
      onMoveShouldSetPanResponder: () => interactive && active,
      onMoveShouldSetPanResponderCapture: () => interactive && active,
      onPanResponderGrant: () => {
        const b = boxRef.current;
        resizeOrigin.current = { w: b.width, h: b.height };
        setToneMenuOpen(false);
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
      onShouldBlockNativeResponder: () => interactive && active,
    })
  ).current;

  const showChrome = active && editing;

  useEffect(() => {
    if (!showChrome) setToneMenuOpen(false);
  }, [showChrome]);

  const width = resizeLive?.w ?? box.width;
  const height = resizeLive?.h ?? box.height;

  const pickTone = (next: MemoTextBoxTone) => {
    onChange({ tone: next });
    setToneMenuOpen(false);
  };

  const toneMenuItem = (next: MemoTextBoxTone, swatchColor: string, label: string) => {
    const on = tone === next;
    return (
      <Pressable
        key={next}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        onPress={() => pickTone(next)}
        style={[styles.toneMenuItem, on && styles.toneMenuItemOn]}>
        <View
          style={[
            styles.toneMenuSwatch,
            { backgroundColor: swatchColor },
            swatchColor === theme.white && styles.toneMenuSwatchLight,
          ]}
        />
        <Text style={styles.toneMenuLabel} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    );
  };

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
        showChrome ? styles.textBoxEditing : styles.textBoxIdle,
        active && !editing && styles.textBoxSelected,
      ]}
      pointerEvents={interactive ? 'auto' : 'none'}>
      <View style={styles.textBoxHeader}>
        {showChrome ? (
          <View style={styles.menuWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={toneLightLabel}
              onPress={() => setToneMenuOpen((open) => !open)}
              hitSlop={6}
              style={styles.menuBtn}>
              <Text style={[styles.menuDots, { color: surface.hintColor }]}>⋯</Text>
            </Pressable>
            {toneMenuOpen ? (
              <View style={styles.toneMenu}>
                {toneMenuItem('light', theme.white, toneLightLabel)}
                {toneMenuItem('dark', theme.black, toneDarkLabel)}
              </View>
            ) : null}
          </View>
        ) : null}
        {showChrome ? (
          <View style={styles.dragHandle} {...dragPan.panHandlers}>
            <View style={[styles.dragGrip, { backgroundColor: surface.hintColor }]} />
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
        onFocus={() => {
          setToneMenuOpen(false);
          onActivate();
        }}
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
  menuWrap: {
    position: 'relative',
    zIndex: 6,
  },
  menuBtn: {
    minWidth: 28,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  menuDots: { fontWeight: '800', fontSize: 16, lineHeight: 18 },
  toneMenu: {
    position: 'absolute',
    left: 0,
    top: 28,
    minWidth: 168,
    backgroundColor: theme.white,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.grayLight,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 8,
  },
  toneMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  toneMenuItemOn: { backgroundColor: theme.orangeSoft },
  toneMenuSwatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  toneMenuSwatchLight: {
    borderWidth: 1,
    borderColor: theme.grayLight,
  },
  toneMenuLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: theme.black,
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
