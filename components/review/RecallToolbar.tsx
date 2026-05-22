import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

import type { RecallTool } from './RecallCanvas';

type Props = {
  tool: RecallTool;
  canEdit: boolean;
  penLabel: string;
  eraserLabel: string;
  undoLabel: string;
  clearLabel: string;
  onToolChange: (tool: RecallTool) => void;
  onUndo: () => void;
  onClear: () => void;
};

export function RecallToolbar({
  tool,
  canEdit,
  penLabel,
  eraserLabel,
  undoLabel,
  clearLabel,
  onToolChange,
  onUndo,
  onClear,
}: Props) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onToolChange('pen-black')}
        style={[styles.chip, tool === 'pen-black' && styles.chipOn]}>
        <Text style={[styles.chipText, tool === 'pen-black' && styles.chipTextOn]}>{penLabel}</Text>
      </Pressable>
      <Pressable
        onPress={() => onToolChange('eraser')}
        style={[styles.chip, tool === 'eraser' && styles.chipOn]}>
        <Text style={[styles.chipText, tool === 'eraser' && styles.chipTextOn]}>{eraserLabel}</Text>
      </Pressable>
      <Pressable
        onPress={onUndo}
        disabled={!canEdit}
        style={[styles.chip, !canEdit && styles.chipDisabled]}>
        <Text style={[styles.chipText, !canEdit && styles.chipTextDisabled]}>{undoLabel}</Text>
      </Pressable>
      <Pressable
        onPress={onClear}
        disabled={!canEdit}
        style={[styles.chip, styles.chipDanger, !canEdit && styles.chipDisabled]}>
        <Text style={[styles.chipText, styles.chipDangerText, !canEdit && styles.chipTextDisabled]}>
          {clearLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.grayLight,
    backgroundColor: theme.white,
  },
  chipOn: { backgroundColor: theme.orange, borderColor: theme.orange },
  chipDanger: { borderColor: theme.orangeSoft },
  chipDisabled: { opacity: 0.45 },
  chipText: { fontSize: 13, fontWeight: '700', color: theme.black },
  chipTextOn: { color: theme.white },
  chipDangerText: { color: theme.orange },
  chipTextDisabled: { color: theme.gray },
});
