import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import { useViewportLayout } from '@/lib/ui/viewport-layout';

const STEPS = ['step1', 'step2', 'step3', 'step4'] as const;

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function AppUsageGuideModal({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const viewport = useViewportLayout();
  const cardWidth = Math.min(viewport.width - 56, 400);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen">
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            {
              width: cardWidth,
              maxHeight: viewport.height - insets.top - insets.bottom - 48,
            },
          ]}
          onPress={() => {}}>
          <Text style={styles.title}>{t('appUsageGuide.title')}</Text>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}>
            {STEPS.map((key, index) => (
              <View key={key} style={styles.stepRow}>
                <Text style={styles.stepNum}>{index + 1}</Text>
                <Text style={styles.stepText}>{t(`appUsageGuide.${key}`)}</Text>
              </View>
            ))}
          </ScrollView>
          <Button label={t('appUsageGuide.close')} onPress={onClose} style={styles.closeBtn} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    zIndex: 99999,
    ...Platform.select({
      web: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0 },
      default: {},
    }),
  },
  card: {
    backgroundColor: theme.beige,
    borderRadius: theme.radius.lg,
    padding: 24,
    maxWidth: '100%',
  },
  title: {
    fontSize: theme.font.heading,
    fontWeight: '800',
    color: theme.black,
    textAlign: 'center',
    marginBottom: 16,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: 14,
    paddingBottom: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: theme.surface,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.grayLight,
    padding: 16,
  },
  stepNum: {
    width: 24,
    fontSize: theme.font.body,
    fontWeight: '800',
    color: theme.orange,
    textAlign: 'center',
  },
  stepText: {
    flex: 1,
    fontSize: theme.font.body,
    lineHeight: 24,
    color: theme.black,
    fontWeight: '500',
  },
  closeBtn: {
    marginTop: 20,
  },
});
