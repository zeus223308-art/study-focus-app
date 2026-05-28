import { useMemo } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import { guideFontMetrics, splitGuideSentences } from '@/lib/ui/format-guide-text';
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

  const hiddenLines = useMemo(
    () => splitGuideSentences(t('appUsageGuide.hiddenTips')),
    [t]
  );
  const lineCount = STEPS.length + hiddenLines.length;
  const metrics = useMemo(() => guideFontMetrics(lineCount), [lineCount]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen">
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('appUsageGuide.close')} />
        <View
          style={[
            styles.card,
            {
              width: cardWidth,
              maxHeight: viewport.height - insets.top - insets.bottom - 48,
            },
          ]}>
          <Text style={[styles.title, lineCount > 12 && styles.titleCompact]}>
            {t('appUsageGuide.title')}
          </Text>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
            bounces={false}
            nestedScrollEnabled>
            <Text
              style={[
                styles.sectionLabel,
                { fontSize: metrics.sectionSize, marginBottom: metrics.rowPadding * 0.5 },
              ]}>
              {t('appUsageGuide.sectionBasic')}
            </Text>
            {STEPS.map((key, index) => (
              <View
                key={key}
                style={[styles.row, { padding: metrics.rowPadding, marginBottom: metrics.rowPadding * 0.65 }]}>
                <Text style={[styles.stepNum, { fontSize: metrics.fontSize }]}>{index + 1}</Text>
                <Text
                  style={[
                    styles.rowText,
                    { fontSize: metrics.fontSize, lineHeight: metrics.lineHeight },
                  ]}>
                  {t(`appUsageGuide.${key}`)}
                </Text>
              </View>
            ))}

            <Text
              style={[
                styles.sectionLabel,
                styles.sectionLabelGap,
                { fontSize: metrics.sectionSize, marginTop: metrics.rowPadding, marginBottom: metrics.rowPadding * 0.5 },
              ]}>
              {t('appUsageGuide.sectionHidden')}
            </Text>
            {hiddenLines.map((line, index) => (
              <View
                key={`hidden-${index}`}
                style={[styles.row, { padding: metrics.rowPadding, marginBottom: metrics.rowPadding * 0.5 }]}>
                <Text style={[styles.bullet, { fontSize: metrics.fontSize, lineHeight: metrics.lineHeight }]}>
                  ·
                </Text>
                <Text
                  style={[
                    styles.rowText,
                    { fontSize: metrics.fontSize, lineHeight: metrics.lineHeight },
                  ]}>
                  {line}
                </Text>
              </View>
            ))}
          </ScrollView>
          <Button label={t('appUsageGuide.close')} onPress={onClose} style={styles.closeBtn} />
        </View>
      </View>
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
    zIndex: 1,
  },
  title: {
    fontSize: theme.font.heading,
    fontWeight: '800',
    color: theme.black,
    textAlign: 'center',
    marginBottom: 16,
  },
  titleCompact: {
    fontSize: theme.font.body,
    marginBottom: 12,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 4,
  },
  sectionLabel: {
    fontWeight: '800',
    color: theme.orange,
  },
  sectionLabelGap: {},
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: theme.surface,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.grayLight,
  },
  stepNum: {
    width: 22,
    fontWeight: '800',
    color: theme.orange,
    textAlign: 'center',
  },
  bullet: {
    width: 14,
    fontWeight: '800',
    color: theme.gray,
    textAlign: 'center',
  },
  rowText: {
    flex: 1,
    color: theme.black,
    fontWeight: '500',
  },
  closeBtn: {
    marginTop: 16,
  },
});
