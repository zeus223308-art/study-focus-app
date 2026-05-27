import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
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

  const recallTool: RecallTool = mode === 'erase' ? 'eraser' : 'pen-black';

  const addTextBox = useCallback(() => {
    const id = `tb_${Date.now()}`;
    const box: ScratchTextBox = {
      id,
      x: width * 0.1,
      y: height * 0.2,
      width: Math.min(160, width * 0.6),
      height: 48,
      text: '',
    };
    onTextBoxesChange([...textBoxes, box]);
    setActiveBoxId(id);
    setMode('text');
  }, [height, onTextBoxesChange, textBoxes, width]);

  const updateBox = (id: string, patch: Partial<ScratchTextBox>) => {
    onTextBoxesChange(textBoxes.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const onCardLayout = (_e: LayoutChangeEvent) => {};

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
    <View style={[styles.card, { width, height }]} onLayout={onCardLayout}>
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

      <View style={[styles.surface, { width, height: height - 36 }]}>
        <RecallCanvas
          strokes={strokes}
          onStrokesChange={onStrokesChange}
          tool={recallTool}
        />
        {textBoxes.map((box) => (
          <View
            key={box.id}
            style={[
              styles.textBox,
              {
                left: box.x,
                top: box.y,
                width: box.width,
                minHeight: box.height,
              },
              activeBoxId === box.id && styles.textBoxActive,
            ]}
            pointerEvents={mode === 'text' ? 'auto' : 'none'}>
            <TextInput
              style={styles.textInput}
              multiline
              value={box.text}
              onChangeText={(text) => updateBox(box.id, { text })}
              onFocus={() => setActiveBoxId(box.id)}
              placeholder={t('review.textBoxPlaceholder')}
              placeholderTextColor={theme.gray}
            />
            {activeBoxId === box.id && mode === 'text' ? (
              <View style={styles.resizeRow}>
                <Pressable
                  onPress={() => updateBox(box.id, { width: Math.max(80, box.width - 20) })}
                  style={styles.resizeBtn}>
                  <Text style={styles.resizeBtnText}>−</Text>
                </Pressable>
                <Pressable
                  onPress={() => updateBox(box.id, { width: Math.min(width - box.x, box.width + 20) })}
                  style={styles.resizeBtn}>
                  <Text style={styles.resizeBtnText}>+</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    onTextBoxesChange(textBoxes.filter((b) => b.id !== box.id));
                    setActiveBoxId(null);
                  }}
                  style={styles.resizeBtn}>
                  <Text style={styles.resizeBtnText}>×</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ))}
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
  surface: { position: 'relative', backgroundColor: theme.white },
  textBox: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: theme.orange,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.92)',
    padding: 4,
  },
  textBoxActive: { borderWidth: 2 },
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
