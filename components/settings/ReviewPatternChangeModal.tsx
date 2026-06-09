import { useEffect, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { theme } from '@/constants/theme';

export const REVIEW_PATTERN_CHANGE_COOLDOWN_SEC = 3;

type Props = {
  visible: boolean;
  onDone: () => void;
};

/** Brief countdown overlay before applying a review pattern change. */
export function ReviewPatternChangeModal({ visible, onDone }: Props) {
  const { t } = useTranslation();
  const [secondsLeft, setSecondsLeft] = useState(REVIEW_PATTERN_CHANGE_COOLDOWN_SEC);

  useEffect(() => {
    if (!visible) {
      setSecondsLeft(REVIEW_PATTERN_CHANGE_COOLDOWN_SEC);
      return;
    }
    setSecondsLeft(REVIEW_PATTERN_CHANGE_COOLDOWN_SEC);
    const tick = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, [visible]);

  useEffect(() => {
    if (!visible || secondsLeft > 0) return;
    onDone();
  }, [visible, secondsLeft, onDone]);

  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => {}}
      statusBarTranslucent
      presentationStyle="overFullScreen">
      <View style={styles.backdrop} pointerEvents="box-none">
        <View style={styles.card}>
          <Text style={styles.message}>
            {secondsLeft > 0
              ? t('settings.reviewPatternChangeWait', { seconds: secondsLeft })
              : t('settings.reviewPatternChangeWait', { seconds: 1 })}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
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
    paddingVertical: 18,
    paddingHorizontal: 22,
    maxWidth: 320,
  },
  message: {
    fontSize: theme.font.body,
    fontWeight: '700',
    color: theme.black,
    textAlign: 'center',
    lineHeight: 22,
  },
});
