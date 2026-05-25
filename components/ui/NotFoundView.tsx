import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import { safeRouterBack } from '@/lib/navigation/safe-back';

type Props = {
  message?: string;
  backFallback?: Href;
};

export function NotFoundView({
  message,
  backFallback = '/(tabs)/vault',
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{message ?? t('common.notFound')}</Text>
      <Button label={t('common.back')} onPress={() => safeRouterBack(router, backFallback)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  text: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.gray,
    textAlign: 'center',
    lineHeight: 22,
  },
});
