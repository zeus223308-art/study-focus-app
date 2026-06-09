import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

/** Static blur/dim overlay on dashboard subject cards after review is done. */
export function SubjectReviewCompleteOverlay() {
  const { t } = useTranslation();

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <View style={styles.scrim} />
      <View style={styles.content}>
        <Text style={styles.check}>✓</Text>
        <Text style={styles.title}>{t('review.reviewComplete')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 4,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  content: {
    zIndex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  check: {
    color: theme.white,
    fontSize: 36,
    fontWeight: '900',
    marginBottom: 6,
  },
  title: {
    color: theme.white,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
});
