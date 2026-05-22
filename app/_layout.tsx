import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AppProvider, useApp } from '@/context/AppContext';
import { theme } from '@/constants/theme';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { data, ready } = useApp();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync();
    const inOnboarding = segments[0] === 'onboarding';
    if (!data.settings.onboardingDone && !inOnboarding) {
      router.replace('/onboarding');
    }
  }, [ready, data.settings.onboardingDone, segments, router]);

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
      <Stack.Screen name="capture" options={{ presentation: 'modal', title: '' }} />
      <Stack.Screen name="folder/[id]" options={{ title: '' }} />
      <Stack.Screen name="item/[id]" options={{ title: '' }} />
      <Stack.Screen name="review/session" options={{ title: '', headerShown: false }} />
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
      <StatusBar style="dark" />
      <RootNavigator />
    </AppProvider>
  );
}
