import { useRef } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { theme } from '@/constants/theme';
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
  const dragOrigin = useRef({ x: box.x, y: box.y });
  const resizeOrigin = useRef({ w: box.width, h: box.height });

  const dragPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => interactive && active,
      onMoveShouldSetPanResponder: () => interactive && active,
      onPanResponderGrant: () => {
        dragOrigin.current = { x: box.x, y: box.y };
        onActivate();
      },
      onPanResponderMove: (_, g) => {
        const nx = Math.max(0, Math.min(surfaceWidth - box.width, dragOrigin.current.x + g.dx));
        const ny = Math.max(0, Math.min(surfaceHeight - box.height, dragOrigin.current.y + g.dy));
        onChange({ x: nx, y: ny });
      },
    })
  ).current;

  const resizePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => interactive && active,
      onMoveShouldSetPanResponder: () => interactive && active,
      onPanResponderGrant: () => {
        resizeOrigin.current = { w: box.width, h: box.height };
        onActivate();
      },
      onPanResponderMove: (_, g) => {
        const w = Math.max(72, Math.min(surfaceWidth - box.x, resizeOrigin.current.w + g.dx));
        const h = Math.max(32, Math.min(surfaceHeight - box.y, resizeOrigin.current.h + g.dy));
        onChange({ width: w, height: h });
      },
    })
  ).current;

  const showChrome = active && editing;

  return (
    <View
      style={[
        styles.textBox,
        { left: box.x, top: box.y, width: box.width, height: box.height },
        showChrome ? styles.textBoxEditing : styles.textBoxIdle,
        active && !editing && styles.textBoxSelected,
      ]}
      pointerEvents={interactive ? 'auto' : 'none'}>
      <View style={styles.textBoxHeader} {...(showChrome ? dragPan.panHandlers : {})}>
        {showChrome ? <Text style={styles.dragHint}>⋯</Text> : null}
        {showChrome ? (
          <Pressable onPress={onRemove} hitSlop={8} style={styles.deleteChip}>
            <Text style={styles.deleteChipText}>×</Text>
          </Pressable>
        ) : null}
      </View>
      <TextInput
        style={[styles.textInput, !showChrome && styles.textInputIdle]}
        multiline
        value={box.text}
        editable={showChrome}
        onChangeText={(text) => onChange({ text })}
        onFocus={onActivate}
        placeholder={placeholder}
        placeholderTextColor={theme.gray}
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
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  textBoxIdle: {
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  textBoxSelected: {
    borderWidth: 1,
    borderColor: theme.orange,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  textBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
    minHeight: 18,
  },
  dragHint: { color: theme.gray, fontWeight: '800', fontSize: 14, paddingHorizontal: 4 },
  deleteChip: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteChipText: { color: theme.white, fontWeight: '800', fontSize: 14, lineHeight: 16 },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: theme.black,
    textAlignVertical: 'top',
    padding: 0,
  },
  textInputIdle: {
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
