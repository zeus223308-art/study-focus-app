import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';

type Props = {
  visible: boolean;
  ready: boolean;
};

export function VaultDragTrashSheet({ visible, ready }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <View style={[styles.host, { paddingBottom: Math.max(insets.bottom, 20) }]} pointerEvents="none">
      <View style={[styles.popup, ready && styles.popupReady]}>
        <Text style={[styles.popupTitle, ready && styles.popupTitleReady]}>
          {t('trash.title')}
        </Text>
        <Text style={[styles.popupHint, ready && styles.popupHintReady]}>
          {ready ? t('vault.dragTrashRelease') : t('vault.dragTrashKeepPull')}
        </Text>
      </View>
      <View style={[styles.iconCircle, ready && styles.iconCircleReady]}>
        <Text style={styles.iconGlyph}>🗑</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  popup: {
    width: '100%',
    maxWidth: 320,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.grayLight,
    backgroundColor: theme.surface,
    alignItems: 'center',
    gap: 6,
    ...theme.cardShadow,
  },
  popupReady: {
    borderColor: theme.orange,
    backgroundColor: theme.orangeMuted,
  },
  popupTitle: {
    fontSize: theme.font.body,
    fontWeight: '800',
    color: theme.gray,
  },
  popupTitleReady: {
    color: theme.orange,
  },
  popupHint: {
    fontSize: theme.font.caption,
    fontWeight: '600',
    color: theme.gray,
    textAlign: 'center',
  },
  popupHintReady: {
    color: theme.orange,
    fontWeight: '700',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: theme.grayLight,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.cardShadow,
  },
  iconCircleReady: {
    borderColor: theme.orange,
    backgroundColor: theme.orangeMuted,
    transform: [{ scale: 1.08 }],
  },
  iconGlyph: {
    fontSize: 28,
  },
});
