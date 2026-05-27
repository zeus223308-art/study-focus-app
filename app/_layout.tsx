import '@/lib/auth/complete-oauth-popup';
import 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { CloudAutoSync } from '@/components/CloudAutoSync';
import { GoogleAuthBootstrap } from '@/components/GoogleAuthBootstrap';
import { RecoveryBanner } from '@/components/RecoveryBanner';
import { FloatingCameraButton } from '@/components/FloatingCameraButton';
import { PaywallGate } from '@/components/paywall/PaywallGate';
import { GoogleOAuthReturnHandler } from '@/components/settings/GoogleOAuthReturnHandler';
import { ChoiceConfirmHost } from '@/components/ui/ChoiceConfirmHost';
import { MobileWebFrame } from '@/components/MobileWebFrame';
import { SplashBrand } from '@/components/SplashBrand';
import { AppProvider, useApp } from '@/context/AppContext';
import { useTranslation } from 'react-i18next';
import { theme } from '@/constants/theme';
import { Image, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { SPLASH_BLACK } from '@/components/MountainMLogo';

const mountainLogo = require('../assets/images/mountain-m-logo.png');

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

/** Session-only overlay — not persisted; unmounts when app closes. */
function shouldShowFloatingCamera(segments: string[]): boolean {
  if (segments.includes('capture')) return false;
  if (segments.includes('review')) return false;
  return true;
}

type RootNavigatorProps = {
  splashDone: boolean;
};

function RootNavigator({ splashDone }: RootNavigatorProps) {
  const { t } = useTranslation();
  const {
    ready,
    autoRecoveryNotice,
    dismissAutoRecoveryNotice,
    derivativeRegenNotice,
    dismissDerivativeRegenNotice,
  } = useApp();
  const segments = useSegments();

  useEffect(() => {
    if (!ready || !splashDone) return;
    void SplashScreen.hideAsync();
  }, [ready, splashDone]);

  if (!splashDone || !ready) return null;

  const showCamera = shouldShowFloatingCamera(segments);

  return (
    <View style={styles.appShell}>
      <GoogleAuthBootstrap />
      <CloudAutoSync />
      {autoRecoveryNotice ? (
        <RecoveryBanner
          source={autoRecoveryNotice}
          message={t('settings.autoRecoveryDone')}
          onDismiss={dismissAutoRecoveryNotice}
        />
      ) : null}
      {!autoRecoveryNotice && derivativeRegenNotice ? (
        <RecoveryBanner
          source="local"
          message={t('settings.derivativeRegenFailed', {
            count: derivativeRegenNotice.failed,
          })}
          onDismiss={dismissDerivativeRegenNotice}
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
        <Stack.Screen name="capture" options={{ headerShown: false }} />
        <Stack.Screen name="folder/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="bundle/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="review/session" options={{ headerShown: false }} />
        <Stack.Screen name="trash" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
      {showCamera && <FloatingCameraButton />}
      <PaywallGate />
      <ChoiceConfirmHost />
    </View>
  );
}

function AppRoot({ splashDone }: { splashDone: boolean }) {
  return (
    <MobileWebFrame>
      <StatusBar style="light" />
      <RootNavigator splashDone={splashDone} />
    </MobileWebFrame>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  appShell: { flex: 1 },
  fontSplash: {
    flex: 1,
    backgroundColor: SPLASH_BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontSplashLogo: {
    width: 240,
    height: 168,
  },
});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [animDone, setAnimDone] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const splashDone = animDone && appReady;

  const onBrandFinish = useCallback(() => setAnimDone(true), []);
  const onAppReady = useCallback(() => setAppReady(true), []);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  if (!loaded) {
    return (
      <View style={styles.fontSplash}>
        <Image source={mountainLogo} style={styles.fontSplashLogo} resizeMode="contain" accessibilityLabel="MemorySherpa logo" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <AppProvider onReady={onAppReady}>
        <AppRoot splashDone={splashDone} />
      </AppProvider>
      {!splashDone ? <SplashBrand onFinish={onBrandFinish} /> : null}
    </GestureHandlerRootView>
  );
}
