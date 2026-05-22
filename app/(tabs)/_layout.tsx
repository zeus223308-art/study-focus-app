import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { theme } from '@/constants/theme';

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.orange,
        tabBarInactiveTintColor: theme.gray,
        tabBarStyle: {
          backgroundColor: theme.white,
          borderTopColor: theme.grayLight,
        },
        headerShown: false,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.dashboard'),
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'square.grid.2x2.fill', android: 'dashboard', web: 'dashboard' }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: t('tabs.vault'),
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'folder.fill', android: 'folder', web: 'folder' }} tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: t('tabs.capture'),
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'gearshape.fill', android: 'settings', web: 'settings' }} tintColor={color} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}
