/**
 * Web root layout — skip custom font gate and Reanimated side-effect import
 * (iPhone 7 / iOS 15 Safari hangs on font load + black splash).
 */
import '@/lib/polyfills/web-legacy';
import '@/lib/auth/complete-oauth-popup';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';

import { CloudAutoSync } from '@/components/CloudAutoSync';
import { GoogleAuthBootstrap } from '@/components/GoogleAuthBootstrap';
import { RecoveryBanner } from '@/components/RecoveryBanner';
import { PaywallGate } from '@/components/paywall/PaywallGate';
import { GoogleOAuthReturnHandler } from '@/components/settings/GoogleOAuthReturnHandler';
import { ChoiceConfirmHost } from '@/components/ui/ChoiceConfirmHost';
import { MobileWebFrame } from '@/components/MobileWebFrame';
import { MobileWebSafeAreaOverride } from '@/components/MobileWebSafeAreaOverride';
import { SplashBrand } from '@/components/SplashBrand';
import { AppProvider, useApp } from '@/context/AppContext';
import { useUnlockDeviceOrientation } from '@/hooks/useUnlockDeviceOrientation';
import { useTranslation } from 'react-i18next';
import { theme } from '@/constants/theme';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { dismissWebBootOverlay } from '@/lib/ui/dismiss-web-boot';
import { isLegacyMobileSafari } from '@/lib/ui/legacy-mobile-safari';

export { AppErrorBoundary as ErrorBoundary } from '@/components/AppErrorBoundary';

SplashScreen.preventAutoHideAsync();

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
  useEffect(() => {
    if (!ready || !splashDone) return;
    dismissWebBootOverlay();
    void SplashScreen.hideAsync();
  }, [ready, splashDone]);

  if (!splashDone || !ready) {
    return (
      <View style={styles.bootLoading}>
        <Text style={styles.bootLoadingTitle}>MemorySherpa</Text>
        <Text style={styles.bootLoadingText}>Loading…</Text>
      </View>
    );
  }

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
      <PaywallGate />
      <ChoiceConfirmHost />
    </View>
  );
}

function AppRoot({ splashDone }: { splashDone: boolean }) {
  useUnlockDeviceOrientation();

  return (
    <MobileWebFrame>
      <StatusBar style="dark" />
      <MobileWebSafeAreaOverride>
        <RootNavigator splashDone={splashDone} />
      </MobileWebSafeAreaOverride>
    </MobileWebFrame>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.beige },
  appShell: { flex: 1 },
  bootLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.beige,
    paddingHorizontal: 24,
  },
  bootLoadingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.black,
    marginBottom: 8,
  },
  bootLoadingText: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.gray,
  },
});

export default function RootLayout() {
  if (typeof window !== 'undefined') {
    (window as unknown as { __MS_ROOT_LAYOUT?: boolean }).__MS_ROOT_LAYOUT = true;
    dismissWebBootOverlay();
  }

  const legacyWeb = isLegacyMobileSafari();
  const [animDone, setAnimDone] = useState(legacyWeb);
  const [appReady, setAppReady] = useState(legacyWeb);
  const splashDone = animDone && appReady;

  const onBrandFinish = useCallback(() => setAnimDone(true), []);
  const onAppReady = useCallback(() => setAppReady(true), []);

  useEffect(() => {
    dismissWebBootOverlay();
    void SplashScreen.hideAsync();
  }, []);

  return (
    <View style={styles.root}>
      <SafeAreaProvider>
        <AppProvider onReady={onAppReady}>
          <AppRoot splashDone={splashDone} />
        </AppProvider>
      </SafeAreaProvider>
      {!splashDone && !legacyWeb ? <SplashBrand onFinish={onBrandFinish} /> : null}
    </View>
  );
}
