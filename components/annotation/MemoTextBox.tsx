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
  const [toneMenuOpen, setToneMenuOpen] = useState(false);
  const [livePos, setLivePos] = useState<{ x: number; y: number } | null>(null);
  const [liveSize, setLiveSize] = useState<{ width: number; height: number } | null>(null);

  const boxRef = useRef(box);
  const surfaceRef = useRef({ width: surfaceWidth, height: surfaceHeight });
  const flagsRef = useRef({ interactive, active });
  const dragOrigin = useRef({ x: 0, y: 0 });
  const resizeOrigin = useRef({ w: 0, h: 0 });
  const livePosRef = useRef<{ x: number; y: number } | null>(null);
  const liveSizeRef = useRef<{ width: number; height: number } | null>(null);

  boxRef.current = box;
  surfaceRef.current = { width: surfaceWidth, height: surfaceHeight };
  flagsRef.current = { interactive, active };

  useEffect(() => {
    livePosRef.current = null;
    liveSizeRef.current = null;
    setLivePos(null);
    setLiveSize(null);
    setToneMenuOpen(false);
  }, [box.id]);

  useEffect(() => {
    if (!editing) setToneMenuOpen(false);
  }, [editing]);

  const posX = livePos?.x ?? box.x;
  const posY = livePos?.y ?? box.y;
  const boxW = liveSize?.width ?? box.width;
  const boxH = liveSize?.height ?? box.height;

  const clampPos = (x: number, y: number, w: number, h: number) => {
    const sw = surfaceRef.current.width;
    const sh = surfaceRef.current.height;
    return {
      x: Math.max(0, Math.min(sw - w, x)),
      y: Math.max(0, Math.min(sh - h, y)),
    };
  };

  const dragPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => flagsRef.current.interactive && flagsRef.current.active,
      onMoveShouldSetPanResponder: () => flagsRef.current.interactive && flagsRef.current.active,
      onPanResponderGrant: () => {
        const b = boxRef.current;
        dragOrigin.current = { x: b.x, y: b.y };
        setToneMenuOpen(false);
        onActivate();
      },
      onPanResponderMove: (_, g) => {
        const b = boxRef.current;
        const size = liveSizeRef.current;
        const w = size?.width ?? b.width;
        const h = size?.height ?? b.height;
        const next = clampPos(dragOrigin.current.x + g.dx, dragOrigin.current.y + g.dy, w, h);
        livePosRef.current = next;
        setLivePos(next);
      },
      onPanResponderRelease: () => {
        const cur = livePosRef.current;
        if (cur) onChange({ x: cur.x, y: cur.y });
        livePosRef.current = null;
        setLivePos(null);
      },
      onPanResponderTerminate: () => {
        livePosRef.current = null;
        setLivePos(null);
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    })
  ).current;

  const resizePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => flagsRef.current.interactive && flagsRef.current.active,
      onMoveShouldSetPanResponder: () => flagsRef.current.interactive && flagsRef.current.active,
      onPanResponderGrant: () => {
        const b = boxRef.current;
        resizeOrigin.current = { w: b.width, h: b.height };
        setToneMenuOpen(false);
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

  const pickTone = (next: MemoTextBoxTone) => {
    onChange({ tone: next });
    setToneMenuOpen(false);
  };

  const toneMenuItem = (next: MemoTextBoxTone, swatchColor: string, label: string) => {
    const on = tone === next;
    return (
      <Pressable
        key={next}
        onPress={() => pickTone(next)}
        style={[styles.toneMenuItem, on && styles.toneMenuItemOn]}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}>
        <View
          style={[
            styles.toneSwatch,
            { backgroundColor: swatchColor },
            swatchColor === theme.white && styles.toneSwatchLight,
          ]}
        />
        <Text style={[styles.toneMenuLabel, on && styles.toneMenuLabelOn]} numberOfLines={1}>
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
          left: posX,
          top: posY,
          width: boxW,
          height: boxH,
          backgroundColor: surface.backgroundColor,
        },
        showChrome ? styles.textBoxEditing : styles.textBoxIdle,
        active && !editing && styles.textBoxSelected,
      ]}
      pointerEvents={interactive ? 'auto' : 'none'}>
      {toneMenuOpen ? (
        <Pressable style={styles.toneMenuDismiss} onPress={() => setToneMenuOpen(false)} />
      ) : null}
      <View style={styles.textBoxHeader}>
        {showChrome ? (
          <View style={styles.menuAnchor}>
            <Pressable
              onPress={() => setToneMenuOpen((open) => !open)}
              hitSlop={8}
              style={styles.dotsBtn}
              accessibilityRole="button"
              accessibilityLabel={toneLightLabel}>
              <Text style={[styles.dragHint, { color: surface.hintColor }]}>⋯</Text>
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
          <View style={styles.dragStrip} {...dragPan.panHandlers} accessibilityLabel="Move text box" />
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
    minHeight: 22,
    gap: 4,
  },
  menuAnchor: {
    position: 'relative',
    zIndex: 6,
  },
  dotsBtn: {
    minWidth: 28,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  dragHint: { fontWeight: '800', fontSize: 16, lineHeight: 18 },
  dragStrip: {
    flex: 1,
    minHeight: 28,
    alignSelf: 'stretch',
  },
  toneMenuDismiss: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 5,
  },
  toneMenu: {
    position: 'absolute',
    top: 30,
    left: 0,
    minWidth: 148,
    backgroundColor: theme.white,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.grayLight,
    paddingVertical: 4,
    zIndex: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  toneMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  toneMenuItemOn: {
    backgroundColor: theme.orangeSoft,
  },
  toneMenuLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: theme.black,
  },
  toneMenuLabelOn: {
    color: theme.orange,
  },
  toneSwatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  toneSwatchLight: {
    borderWidth: 1,
    borderColor: theme.grayLight,
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
