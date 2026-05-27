import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { DockTabBar } from '@/components/DockTabBar';
import { CaptureLeaveGuardProvider } from '@/components/capture/CaptureLeaveGuard';
import { AppUsageGuideProvider } from '@/context/AppUsageGuideContext';
import { VaultSubjectMenuProvider } from '@/context/VaultSubjectMenuContext';

export default function TabLayout() {
  return (
    <CaptureLeaveGuardProvider>
    <AppUsageGuideProvider>
    <VaultSubjectMenuProvider>
    <View style={styles.root}>
    <Tabs
      initialRouteName="index"
      tabBar={(props) => <DockTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: { display: 'none' },
      }}>
      <Tabs.Screen name="vault" />
      <Tabs.Screen name="index" />
      <Tabs.Screen name="capture" options={{ href: null }} />
      <Tabs.Screen name="settings" />
    </Tabs>
    </View>
    </VaultSubjectMenuProvider>
    </AppUsageGuideProvider>
    </CaptureLeaveGuardProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
