import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, Text, View } from 'react-native';

import { SPLASH_BLACK } from '@/components/MountainMLogo';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

const mountainLogo = require('@/assets/images/mountain-m-logo.png');

const STEPS = ['welcome', 'step1', 'step2', 'step3'] as const;

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { updateSettings } = useApp();
  const [step, setStep] = useState(0);

  const finish = () => {
    updateSettings({ onboardingDone: true });
    router.replace('/(tabs)');
  };

  const key = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <Screen>
      <View style={styles.logoBox}>
        <Image
          source={mountainLogo}
          style={styles.logoImage}
          resizeMode="cover"
          accessibilityLabel={t('appName')}
        />
      </View>
      <Text style={styles.brand}>{t('appName')}</Text>
      <View style={styles.card}>
        <Text style={styles.title}>{t(`onboarding.${key}`)}</Text>
      </View>
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
        ))}
      </View>
      {!isLast ? (
        <>
          <Button label={t('review.next')} onPress={() => setStep((s) => s + 1)} />
          <Button label={t('onboarding.skip')} variant="ghost" onPress={finish} style={{ marginTop: 8 }} />
        </>
      ) : (
        <Button label={t('onboarding.start')} onPress={finish} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  logoBox: {
    width: 64,
    height: 64,
    backgroundColor: SPLASH_BLACK,
    borderWidth: 2,
    borderColor: theme.grayLight,
    overflow: 'hidden',
    alignSelf: 'center',
    marginTop: 24,
  },
  logoImage: { width: '100%', height: '100%' },
  brand: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 24,
    color: theme.black,
  },
  card: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: theme.grayLight,
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    lineHeight: 30,
    color: theme.black,
    fontWeight: '500',
    textAlign: 'center',
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.grayLight },
  dotActive: { backgroundColor: theme.orange, width: 20 },
});
