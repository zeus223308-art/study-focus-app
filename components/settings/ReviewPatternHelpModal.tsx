import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ReviewPatternPickerCard } from '@/components/settings/ReviewPatternPickerCard';
import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import type { Language, ReviewSchedule } from '@/lib/domain/types';
import { useViewportLayout } from '@/lib/ui/viewport-layout';

type Props = {
  visible: boolean;
  schedules: ReviewSchedule[];
  activeScheduleIds: string[];
  language: Language;
  onToggleSchedule: (id: string) => void;
  onAddPattern: () => void;
  onClose: () => void;
};

export function ReviewPatternHelpModal({
  visible,
  schedules,
  activeScheduleIds,
  language,
  onToggleSchedule,
  onAddPattern,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const viewport = useViewportLayout();
  const pad = viewport.isPhone ? 20 : viewport.horizontalPadding;
  const cardWidth = Math.min(viewport.width - pad * 2, viewport.contentMaxWidth);

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
        <View style={[styles.sheet, { width: cardWidth, maxHeight: viewport.height - 80 }]}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
            nestedScrollEnabled>
            <Text style={styles.intro}>{t('settings.reviewPatternIntro')}</Text>
            <ReviewPatternPickerCard
              schedules={schedules}
              activeScheduleIds={activeScheduleIds}
              language={language}
              onToggleSchedule={onToggleSchedule}
              onAddPattern={onAddPattern}
            />
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
    padding: 20,
    ...Platform.select({
      web: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0 },
      default: {},
    }),
  },
  sheet: {
    zIndex: 1,
    maxWidth: '100%',
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 4,
  },
  intro: {
    fontSize: theme.font.bodySmall,
    lineHeight: 22,
    color: theme.black,
    fontWeight: '500',
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.grayLight,
    padding: 16,
  },
  closeBtn: {
    marginTop: 16,
  },
});
