import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Keyboard,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { RecallCanvas, type RecallTool } from '@/components/review/RecallCanvas';
import { theme } from '@/constants/theme';
import type { InkStroke } from '@/lib/domain/types';

export type ScratchTextBox = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
};

type WorkMode = 'draw' | 'text' | 'erase';

type Props = {
  width: number;
  height: number;
  strokes: InkStroke[];
  onStrokesChange: (strokes: InkStroke[]) => void;
  textBoxes: ScratchTextBox[];
  onTextBoxesChange: (boxes: ScratchTextBox[]) => void;
  onCanvasTouchChange?: (active: boolean) => void;
};

function DraggableTextBox({
  box,
  active,
  editing,
  mode,
  cardWidth,
  cardHeight,
  placeholder,
  onChange,
  onActivate,
  onRemove,
}: {
  box: ScratchTextBox;
  active: boolean;
  editing: boolean;
  mode: WorkMode;
  cardWidth: number;
  cardHeight: number;
  placeholder: string;
  onChange: (patch: Partial<ScratchTextBox>) => void;
  onActivate: () => void;
  onRemove: () => void;
}) {
  const dragOrigin = useRef({ x: box.x, y: box.y });
  const resizeOrigin = useRef({ w: box.width, h: box.height });

  const dragPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => mode === 'text' && active,
      onMoveShouldSetPanResponder: () => mode === 'text' && active,
      onPanResponderGrant: () => {
        dragOrigin.current = { x: box.x, y: box.y };
        onActivate();
      },
      onPanResponderMove: (_, g) => {
        const nx = Math.max(0, Math.min(cardWidth - box.width, dragOrigin.current.x + g.dx));
        const ny = Math.max(0, Math.min(cardHeight - box.height, dragOrigin.current.y + g.dy));
        onChange({ x: nx, y: ny });
      },
    })
  ).current;

  const resizePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => mode === 'text' && active,
      onMoveShouldSetPanResponder: () => mode === 'text' && active,
      onPanResponderGrant: () => {
        resizeOrigin.current = { w: box.width, h: box.height };
        onActivate();
      },
      onPanResponderMove: (_, g) => {
        const w = Math.max(72, Math.min(cardWidth - box.x, resizeOrigin.current.w + g.dx));
        const h = Math.max(32, Math.min(cardHeight - box.y, resizeOrigin.current.h + g.dy));
        onChange({ width: w, height: h });
      },
    })
  ).current;

  const showChrome = active && editing;

  return (
    <View
      style={[
        styles.textBox,
        {
          left: box.x,
          top: box.y,
          width: box.width,
          height: box.height,
        },
        showChrome ? styles.textBoxEditing : styles.textBoxIdle,
        active && !editing && styles.textBoxSelected,
      ]}
      pointerEvents={mode === 'text' ? 'auto' : 'none'}>
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

export function RecallWorkCard({
  width,
  height,
  strokes,
  onStrokesChange,
  textBoxes,
  onTextBoxesChange,
  onCanvasTouchChange,
}: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<WorkMode>('draw');
  const [activeBoxId, setActiveBoxId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState(false);

  const recallTool: RecallTool = mode === 'erase' ? 'eraser' : 'pen-black';
  const surfaceH = height - 36;
  const canvasInteractive = mode === 'draw' || mode === 'erase' || (mode === 'text' && !editingText);

  const dismissTextEditing = useCallback(() => {
    setEditingText(false);
    setActiveBoxId(null);
    Keyboard.dismiss();
  }, []);

  const addTextBox = useCallback(() => {
    const id = `tb_${Date.now()}`;
    const box: ScratchTextBox = {
      id,
      x: width * 0.1,
      y: surfaceH * 0.2,
      width: Math.min(160, width * 0.55),
      height: 56,
      text: '',
    };
    onTextBoxesChange([...textBoxes, box]);
    setActiveBoxId(id);
    setEditingText(true);
    setMode('text');
  }, [onTextBoxesChange, surfaceH, textBoxes, width]);

  const updateBox = (id: string, patch: Partial<ScratchTextBox>) => {
    onTextBoxesChange(textBoxes.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const modeBtn = (m: WorkMode, label: string) => (
    <Pressable
      key={m}
      onPress={() => {
        if (m !== 'text') dismissTextEditing();
        setMode(m);
        if (m === 'text' && textBoxes.length === 0) addTextBox();
      }}
      style={[styles.modeBtn, mode === m && styles.modeBtnOn]}>
      <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextOn]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={[styles.card, { width, height }]}>
      <View style={styles.modeRow}>
        {modeBtn('draw', t('review.workDraw'))}
        {modeBtn('text', t('review.workText'))}
        {modeBtn('erase', t('review.workEraser'))}
        {mode === 'text' ? (
          <Pressable onPress={addTextBox} style={styles.addText}>
            <Text style={styles.addTextLabel}>+</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.surfaceOuter, { width, height: surfaceH }]}>
        <View style={[styles.surface, { width, height: surfaceH }]}>
          <View
            style={[styles.canvasLayer, { width, height: surfaceH }]}
            pointerEvents={canvasInteractive ? 'auto' : 'none'}>
            <RecallCanvas
              strokes={strokes}
              onStrokesChange={onStrokesChange}
              tool={recallTool}
              onTouchStart={() => onCanvasTouchChange?.(true)}
              onTouchEnd={() => onCanvasTouchChange?.(false)}
            />
          </View>
          {editingText ? (
            <Pressable style={styles.dismissBackdrop} onPress={dismissTextEditing} />
          ) : null}
          {textBoxes.map((box) => (
            <DraggableTextBox
              key={box.id}
              box={box}
              active={activeBoxId === box.id}
              editing={editingText && activeBoxId === box.id}
              mode={mode}
              cardWidth={width}
              cardHeight={surfaceH}
              placeholder={t('review.textBoxPlaceholder')}
              onChange={(patch) => updateBox(box.id, patch)}
              onActivate={() => {
                setActiveBoxId(box.id);
                setEditingText(true);
              }}
              onRemove={() => {
                onTextBoxesChange(textBoxes.filter((b) => b.id !== box.id));
                dismissTextEditing();
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.grayLight,
    backgroundColor: theme.white,
    overflow: 'hidden',
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.grayLight,
  },
  modeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.beige,
  },
  modeBtnOn: { backgroundColor: theme.orange },
  modeBtnText: { fontSize: 11, fontWeight: '800', color: theme.gray },
  modeBtnTextOn: { color: theme.white },
  addText: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTextLabel: { color: theme.orange, fontWeight: '800', fontSize: 16 },
  surfaceOuter: {
    overflow: 'hidden',
    backgroundColor: theme.white,
    position: 'relative',
  },
  dismissBackdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
  },
  surface: {
    position: 'relative',
    backgroundColor: theme.white,
    zIndex: 1,
  },
  canvasLayer: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
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
