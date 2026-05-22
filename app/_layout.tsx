import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { MobileWebFrame } from '@/components/MobileWebFrame';
import { SplashBrand } from '@/components/SplashBrand';
import { AppProvider, useApp } from '@/context/AppContext';
import { theme } from '@/constants/theme';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { data, ready } = useApp();
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

  return (
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
      <Stack.Screen name="folder/[id]" options={{ title: '' }} />
      <Stack.Screen name="bundle/[id]" options={{ title: '' }} />
      <Stack.Screen name="review/session" options={{ headerShown: false }} />
      <Stack.Screen name="trash" options={{ title: '' }} />
      <Stack.Screen name="search" options={{ presentation: 'modal', title: '' }} />
    </Stack>
  );
}

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
