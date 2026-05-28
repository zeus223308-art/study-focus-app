import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

export type PhotoMemoToolKind = 'pen' | 'highlighter' | 'eraser' | 'text';

type Props = {
  activeKind: PhotoMemoToolKind | null;
  onSelectKind: (kind: PhotoMemoToolKind) => void;
};

export function PhotoMemoToolbar({ activeKind, onSelectKind }: Props) {
  const { t } = useTranslation();

  const btn = (kind: PhotoMemoToolKind, label: string, on: boolean) => (
    <Pressable
      key={kind}
      onPress={() => onSelectKind(kind)}
      style={[styles.btn, on && styles.btnOn]}
      accessibilityRole="button">
      <Text style={[styles.btnText, on && styles.btnTextOn]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.bar}>
      {btn('pen', t('item.toolPen'), activeKind === 'pen')}
      {btn('highlighter', t('item.toolHighlighter'), activeKind === 'highlighter')}
      {btn('eraser', t('item.toolEraser'), activeKind === 'eraser')}
      {btn('text', t('review.workText'), activeKind === 'text')}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    paddingVertical: 4,
  },
  btn: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 72,
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
  btnText: { fontSize: theme.font.caption, fontWeight: '800', color: theme.black },
  btnTextOn: { color: theme.white },
});
