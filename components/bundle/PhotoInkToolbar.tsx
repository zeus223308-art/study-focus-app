import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PenInkSwatch } from '@/components/annotation/PenInkSwatch';
import { theme } from '@/constants/theme';
import type { PenToolId } from '@/lib/domain/types';

export type PhotoInkToolKind = 'pen' | 'highlighter' | 'eraser' | 'crop';

type Props = {
  activeKind: PhotoInkToolKind | null;
  /** Selected pen color tool (problem photo modal). */
  penTool?: PenToolId | null;
  onSelectKind: (kind: PhotoInkToolKind) => void;
};

export function PhotoInkToolbar({ activeKind, penTool, onSelectKind }: Props) {
  const { t } = useTranslation();

  const isPen = activeKind === 'pen';
  const isHi = activeKind === 'highlighter';
  const isEraser = activeKind === 'eraser';
  const isCrop = activeKind === 'crop';

  const btn = (kind: PhotoInkToolKind, label: string, on: boolean) => (
    <Pressable
      key={kind}
      onPress={() => onSelectKind(kind)}
      style={[styles.btn, on && styles.btnOn]}
      accessibilityRole="button">
      <View style={styles.btnInner}>
        {kind === 'pen' && penTool ? <PenInkSwatch tool={penTool} size={14} /> : null}
        <Text style={[styles.btnText, on && styles.btnTextOn]}>{label}</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.bar}>
      {btn('pen', t('item.toolPen'), isPen)}
      {btn('highlighter', t('item.toolHighlighter'), isHi)}
      {btn('eraser', t('item.toolEraser'), isEraser)}
      {btn('crop', t('item.toolCrop'), isCrop)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    paddingVertical: 4,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.grayLight,
    alignItems: 'center',
  },
  btnOn: {
    backgroundColor: theme.orange,
    borderColor: theme.orange,
  },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btnText: { fontSize: theme.font.caption, fontWeight: '800', color: theme.black },
  btnTextOn: { color: theme.white },
});
