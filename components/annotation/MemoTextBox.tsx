import { useRef } from 'react';
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
  const dragOrigin = useRef({ x: box.x, y: box.y });
  const resizeOrigin = useRef({ w: box.width, h: box.height });

  const dragPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => interactive && active,
      onStartShouldSetPanResponderCapture: () => interactive && active,
      onMoveShouldSetPanResponder: () => interactive && active,
      onMoveShouldSetPanResponderCapture: () => interactive && active,
      onPanResponderGrant: () => {
        dragOrigin.current = { x: box.x, y: box.y };
        onActivate();
      },
      onPanResponderMove: (_, g) => {
        const nx = Math.max(0, Math.min(surfaceWidth - box.width, dragOrigin.current.x + g.dx));
        const ny = Math.max(0, Math.min(surfaceHeight - box.height, dragOrigin.current.y + g.dy));
        onChange({ x: nx, y: ny });
      },
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
        resizeOrigin.current = { w: box.width, h: box.height };
        onActivate();
      },
      onPanResponderMove: (_, g) => {
        const w = Math.max(72, Math.min(surfaceWidth - box.x, resizeOrigin.current.w + g.dx));
        const h = Math.max(32, Math.min(surfaceHeight - box.y, resizeOrigin.current.h + g.dy));
        onChange({ width: w, height: h });
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => interactive && active,
    })
  ).current;

  const showChrome = active && editing;

  const toneChip = (next: MemoTextBoxTone, swatchColor: string, label: string) => {
    const on = tone === next;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: on }}
        onPress={() => onChange({ tone: next })}
        style={[styles.toneChip, on && styles.toneChipOn]}
        hitSlop={4}>
        <View
          style={[
            styles.toneSwatch,
            { backgroundColor: swatchColor },
            swatchColor === theme.white && styles.toneSwatchLight,
          ]}
        />
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.textBox,
        { left: box.x, top: box.y, width: box.width, height: box.height, backgroundColor: surface.backgroundColor },
        showChrome ? styles.textBoxEditing : styles.textBoxIdle,
        active && !editing && styles.textBoxSelected,
      ]}
      pointerEvents={interactive ? 'auto' : 'none'}>
      <View style={styles.textBoxHeader} {...(showChrome ? dragPan.panHandlers : {})}>
        {showChrome ? <Text style={[styles.dragHint, { color: surface.hintColor }]}>⋯</Text> : null}
        {showChrome ? (
          <View style={styles.toneRow}>
            {toneChip('light', theme.white, toneLightLabel)}
            {toneChip('dark', theme.black, toneDarkLabel)}
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
    justifyContent: 'space-between',
    marginBottom: 2,
    minHeight: 18,
    gap: 4,
  },
  dragHint: { fontWeight: '800', fontSize: 14, paddingHorizontal: 2 },
  toneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' },
  toneChip: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  toneChipOn: { borderColor: theme.orange, backgroundColor: theme.orangeSoft },
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
