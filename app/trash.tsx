import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';

import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { TrashContents } from '@/components/trash/TrashContents';
import { theme } from '@/constants/theme';

export default function TrashScreen() {
  const { t } = useTranslation();

  return (
    <Screen scroll>
      <ScreenHeader title="" showBack backFallback="/(tabs)/vault" showSettings={false} />
      <Text style={styles.pageTitle}>{t('trash.title')}</Text>
      <TrashContents />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: theme.black,
    letterSpacing: -0.5,
    marginTop: 4,
    marginBottom: 6,
  },
});
