import { Modal, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';

type Props = {
  visible: boolean;
  reason: 'images' | 'memos';
  used: number;
  max: number;
  onClose: () => void;
};

export function PaywallSheet({ visible, reason, used, max, onClose }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const title =
    reason === 'images' ? t('paywall.imagesTitle') : t('paywall.memosTitle');
  const body =
    reason === 'images'
      ? t('paywall.imagesBody', { used, max })
      : t('paywall.memosBody', { used, max });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: Math.max(40, insets.bottom + 20) }]}>
          <View style={styles.accentBar} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <Text style={styles.pro}>{t('paywall.proBenefits')}</Text>
          <Button label={t('paywall.gotIt')} onPress={onClose} style={{ marginTop: 20 }} />
          <Button label={t('paywall.later')} variant="ghost" onPress={onClose} style={{ marginTop: 8 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.beige,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    padding: 28,
  },
  accentBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.orange,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: { fontSize: theme.font.heading, fontWeight: '800', color: theme.black },
  body: { fontSize: theme.font.body, color: theme.gray, marginTop: 10, lineHeight: 24 },
  pro: { fontSize: theme.font.bodySmall, color: theme.graySecondary, marginTop: 16 },
});
