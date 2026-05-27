import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
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

const ZOOM_STEPS = [0.75, 1, 1.25, 1.5] as const;

type Props = {
  width: number;
  height: number;
  strokes: InkStroke[];
  onStrokesChange: (strokes: InkStroke[]) => void;
  textBoxes: ScratchTextBox[];
  onTextBoxesChange: (boxes: ScratchTextBox[]) => void;
};

function DraggableTextBox({
  box,
  active,
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
  mode: WorkMode;
  cardWidth: number;
  cardHeight: number;
  placeholder: string;
  onChange: (patch: Partial<ScratchTextBox>) => void;
  onActivate: () => void;
  onRemove: () => void;
}) {
  const dragOrigin = useRef({ x: box.x, y: box.y });

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => mode === 'text',
      onMoveShouldSetPanResponder: () => mode === 'text',
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

  return (
    <View
      style={[
        styles.textBox,
        {
          left: box.x,
          top: box.y,
          width: box.width,
          minHeight: box.height,
        },
        active && styles.textBoxActive,
      ]}
      pointerEvents={mode === 'text' ? 'auto' : 'none'}>
      <View style={styles.textBoxHeader} {...pan.panHandlers}>
        <Text style={styles.dragHint}>⋯</Text>
        {active && mode === 'text' ? (
          <Pressable onPress={onRemove} hitSlop={8} style={styles.deleteChip}>
            <Text style={styles.deleteChipText}>×</Text>
          </Pressable>
        ) : null}
      </View>
      <TextInput
        style={styles.textInput}
        multiline
        value={box.text}
        onChangeText={(text) => onChange({ text })}
        onFocus={onActivate}
        placeholder={placeholder}
        placeholderTextColor={theme.gray}
      />
      {active && mode === 'text' ? (
        <View style={styles.resizeRow}>
          <Pressable
            onPress={() => onChange({ width: Math.max(80, box.width - 20) })}
            style={styles.resizeBtn}>
            <Text style={styles.resizeBtnText}>−</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              onChange({ width: Math.min(cardWidth - box.x, box.width + 20) })
            }
            style={styles.resizeBtn}>
            <Text style={styles.resizeBtnText}>+</Text>
          </Pressable>
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
}: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<WorkMode>('draw');
  const [activeBoxId, setActiveBoxId] = useState<string | null>(null);
  const [zoomIndex, setZoomIndex] = useState(1);

  const recallTool: RecallTool = mode === 'erase' ? 'eraser' : 'pen-black';
  const zoom = ZOOM_STEPS[zoomIndex] ?? 1;
  const surfaceH = height - 36;

  const addTextBox = useCallback(() => {
    const id = `tb_${Date.now()}`;
    const box: ScratchTextBox = {
      id,
      x: width * 0.1,
      y: surfaceH * 0.2,
      width: Math.min(160, width * 0.6),
      height: 48,
      text: '',
    };
    onTextBoxesChange([...textBoxes, box]);
    setActiveBoxId(id);
    setMode('text');
  }, [onTextBoxesChange, surfaceH, textBoxes, width]);

  const updateBox = (id: string, patch: Partial<ScratchTextBox>) => {
    onTextBoxesChange(textBoxes.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const modeBtn = (m: WorkMode, label: string) => (
    <Pressable
      key={m}
      onPress={() => {
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
        <Pressable
          onPress={() => setZoomIndex((i) => Math.max(0, i - 1))}
          disabled={zoomIndex <= 0}
          style={[styles.zoomBtn, zoomIndex <= 0 && styles.zoomBtnDisabled]}>
          <Text style={styles.zoomBtnText}>−</Text>
        </Pressable>
        <Pressable
          onPress={() => setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
          disabled={zoomIndex >= ZOOM_STEPS.length - 1}
          style={[styles.zoomBtn, zoomIndex >= ZOOM_STEPS.length - 1 && styles.zoomBtnDisabled]}>
          <Text style={styles.zoomBtnText}>+</Text>
        </Pressable>
        {mode === 'text' ? (
          <Pressable onPress={addTextBox} style={styles.addText}>
            <Text style={styles.addTextLabel}>+</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.surfaceOuter, { width, height: surfaceH }]}>
        <View
          style={[
            styles.surface,
            {
              width,
              height: surfaceH,
              transform: [{ scale: zoom }],
            },
          ]}>
          <RecallCanvas strokes={strokes} onStrokesChange={onStrokesChange} tool={recallTool} />
          {textBoxes.map((box) => (
            <DraggableTextBox
              key={box.id}
              box={box}
              active={activeBoxId === box.id}
              mode={mode}
              cardWidth={width}
              cardHeight={surfaceH}
              placeholder={t('review.textBoxPlaceholder')}
              onChange={(patch) => updateBox(box.id, patch)}
              onActivate={() => setActiveBoxId(box.id)}
              onRemove={() => {
                onTextBoxesChange(textBoxes.filter((b) => b.id !== box.id));
                setActiveBoxId(null);
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
  zoomBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.beige,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnDisabled: { opacity: 0.35 },
  zoomBtnText: { fontWeight: '800', fontSize: 16, color: theme.black },
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  surface: {
    position: 'relative',
    backgroundColor: theme.white,
  },
  textBox: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: theme.orange,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.92)',
    padding: 4,
  },
  textBoxActive: { borderWidth: 2 },
  textBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
    minHeight: 20,
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
    fontSize: 14,
    color: theme.black,
    minHeight: 36,
    textAlignVertical: 'top',
  },
  resizeRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  resizeBtn: {
    flex: 1,
    paddingVertical: 2,
    backgroundColor: theme.grayLight,
    borderRadius: 4,
    alignItems: 'center',
  },
  resizeBtnText: { fontWeight: '800', fontSize: 12, color: theme.black },
});
