import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';

import { MemoTextBoxView, type MemoTextBox } from '@/components/annotation/MemoTextBox';
import { RecallCanvas, type RecallTool } from '@/components/review/RecallCanvas';
import { theme } from '@/constants/theme';
import type { InkStroke } from '@/lib/domain/types';

export type ScratchTextBox = MemoTextBox;

type WorkMode = 'draw' | 'text' | 'erase';

type Props = {
  width: number;
  height: number;
  strokes: InkStroke[];
  onStrokesChange: (strokes: InkStroke[]) => void;
  textBoxes: ScratchTextBox[];
  onTextBoxesChange: (boxes: ScratchTextBox[]) => void;
};

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
          allowVerticalScrollPassthrough
        />
          </View>
          {editingText ? (
            <Pressable style={styles.dismissBackdrop} onPress={dismissTextEditing} />
          ) : null}
          {textBoxes.map((box) => (
            <MemoTextBoxView
              key={box.id}
              box={box}
              active={activeBoxId === box.id}
              editing={editingText && activeBoxId === box.id}
              interactive={mode === 'text'}
              surfaceWidth={width}
              surfaceHeight={surfaceH}
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
});
