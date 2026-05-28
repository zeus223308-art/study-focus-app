import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

export type PhotoInkToolKind = 'pen' | 'highlighter' | 'eraser' | 'crop';

type Props = {
  activeKind: PhotoInkToolKind | null;
  /** Active pen ink color when pen tool is selected (problem photo modal). */
  penInkColor?: string | null;
  onSelectKind: (kind: PhotoInkToolKind) => void;
};

export function PhotoInkToolbar({ activeKind, penInkColor, onSelectKind }: Props) {
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
        {kind === 'pen' && penInkColor ? (
          <View
            style={[
              styles.penDot,
              { backgroundColor: penInkColor },
              penInkColor.toUpperCase() === '#FFFFFF' && styles.penDotWhite,
            ]}
          />
        ) : null}
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
  penDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: theme.grayLight,
  },
  penDotWhite: { borderColor: '#666666', borderWidth: 2 },
  btnText: { fontSize: theme.font.caption, fontWeight: '800', color: theme.black },
  btnTextOn: { color: theme.white },
});
