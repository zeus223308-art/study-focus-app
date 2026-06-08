import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onRestoreToday: () => void;
  onRestoreKeepDate: () => void;
};

/** Ask whether archived photos should restore with today's study date or keep the original. */
export function RestoreDateChoiceSheet({
  visible,
  onClose,
  onRestoreToday,
  onRestoreKeepDate,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(24, insets.bottom + 12) }]}
          onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>{t('folder.restoreDateTitle')}</Text>
          <Text style={styles.message}>{t('folder.restoreDateMessage')}</Text>
          <Button
            label={t('folder.restoreDateToday')}
            variant="secondary"
            onPress={onRestoreToday}
          />
          <Button
            label={t('folder.restoreDateKeep')}
            variant="secondary"
            onPress={onRestoreKeepDate}
            style={styles.choiceBtn}
          />
          <Pressable onPress={onClose} style={styles.cancelRow} accessibilityRole="button">
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    ...Platform.select({
      web: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0 },
      default: {},
    }),
  },
  sheet: {
    backgroundColor: theme.beige,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    paddingTop: 10,
    paddingHorizontal: 24,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 360,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.grayLight,
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: theme.font.heading,
    fontWeight: '800',
    color: theme.black,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: theme.font.bodySmall,
    color: theme.gray,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  choiceBtn: { marginTop: 8 },
  cancelRow: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.grayMuted,
  },
});
