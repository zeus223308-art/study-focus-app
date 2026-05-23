import '@/lib/auth/complete-oauth-popup';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { GoogleAuthBootstrap } from '@/components/GoogleAuthBootstrap';
import { RecoveryBanner } from '@/components/RecoveryBanner';
import { FloatingCameraButton } from '@/components/FloatingCameraButton';
import { GoogleOAuthReturnHandler } from '@/components/settings/GoogleOAuthReturnHandler';
import { MobileWebFrame } from '@/components/MobileWebFrame';
import { SplashBrand } from '@/components/SplashBrand';
import { AppProvider, useApp } from '@/context/AppContext';
import { useTranslation } from 'react-i18next';
import { theme } from '@/constants/theme';
import { StyleSheet, View } from 'react-native';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

/** Session-only overlay — not persisted; unmounts when app closes. */
function shouldShowFloatingCamera(segments: string[]): boolean {
  if (segments[0] === 'onboarding') return false;
  if (segments.includes('capture')) return false;
  return true;
}

function RootNavigator() {
  const { t } = useTranslation();
  const { data, ready, autoRecoveryNotice, dismissAutoRecoveryNotice } = useApp();
  const router = useRouter();
  const segments = useSegments();
  const [brandDone, setBrandDone] = useState(false);

  const onBrandFinish = useCallback(() => setBrandDone(true), []);

  useEffect(() => {
    if (!ready || !brandDone) return;
    SplashScreen.hideAsync();
    const inOnboarding = segments[0] === 'onboarding';
    if (!data.settings.onboardingDone && !inOnboarding) {
      router.replace('/onboarding');
    }
  }, [ready, brandDone, data.settings.onboardingDone, segments, router]);

  if (!brandDone) return <SplashBrand onFinish={onBrandFinish} />;

  const showCamera = shouldShowFloatingCamera(segments);

  return (
    <View style={styles.appShell}>
      <GoogleAuthBootstrap />
      {autoRecoveryNotice ? (
        <RecoveryBanner
          source={autoRecoveryNotice}
          message={t('settings.autoRecoveryDone')}
          onDismiss={dismissAutoRecoveryNotice}
        />
      ) : null}
      <GoogleOAuthReturnHandler />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.beige },
          headerTintColor: theme.black,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.beige },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="capture" options={{ headerShown: false }} />
        <Stack.Screen name="folder/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="bundle/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="review/session" options={{ headerShown: false }} />
        <Stack.Screen name="trash" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
      {showCamera && <FloatingCameraButton />}
    </View>
  );
}

const styles = StyleSheet.create({
  appShell: { flex: 1 },
});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  if (!loaded) return null;

  return (
    <AppProvider>
      <MobileWebFrame>
        <StatusBar style="dark" />
        <RootNavigator />
      </MobileWebFrame>
    </AppProvider>
  );
}
