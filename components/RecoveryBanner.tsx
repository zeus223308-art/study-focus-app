import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import type { AutoRecoverySource } from '@/services/storage/auto-recovery';

type Props = {
  source: AutoRecoverySource;
  message: string;
  onDismiss: () => void;
};

export function RecoveryBanner({ source, message, onDismiss }: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{message}</Text>
      <Text style={styles.sub}>
        {source === 'drive' ? t('settings.autoRecoveryFromDrive') : t('settings.autoRecoveryFromLocal')}
      </Text>
      <Pressable onPress={onDismiss} hitSlop={8}>
        <Text style={styles.dismiss}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.orangeMuted,
    borderBottomWidth: 1,
    borderBottomColor: theme.orange,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: { flex: 1, fontSize: theme.font.caption, fontWeight: '700', color: theme.black },
  sub: { fontSize: 10, fontWeight: '600', color: theme.gray },
  dismiss: { fontSize: 16, fontWeight: '700', color: theme.gray, paddingLeft: 4 },
});
