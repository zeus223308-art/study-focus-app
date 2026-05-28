import { type ErrorBoundaryProps } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

/** Replaces the default Expo Router boundary so Retry does not imply lost captures. */
export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>{t('errors.boundaryTitle')}</Text>
        <Text style={styles.hint}>{t('errors.boundaryCaptureHint')}</Text>
        <Text style={styles.detail} selectable>
          {error.message}
        </Text>
        <Pressable onPress={retry} style={styles.retryBtn} accessibilityRole="button">
          <Text style={styles.retryText}>{t('errors.boundaryRetry')}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.beige },
  body: { flexGrow: 1, justifyContent: 'center', padding: 28, gap: 14 },
  title: { fontSize: theme.font.heading, fontWeight: '800', color: theme.black },
  hint: { fontSize: theme.font.body, color: theme.gray, lineHeight: 24 },
  detail: {
    fontSize: theme.font.caption,
    color: theme.grayMuted,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  retryBtn: {
    marginTop: 8,
    alignSelf: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: theme.radius.md,
    backgroundColor: theme.orange,
  },
  retryText: { color: theme.white, fontWeight: '800', fontSize: theme.font.body },
});
