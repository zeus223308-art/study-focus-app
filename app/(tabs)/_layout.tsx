import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        tabBarInactiveTintColor: Colors[colorScheme].tabIconDefault,
        tabBarStyle: {
          backgroundColor: Colors[colorScheme].card,
          borderTopColor: Colors[colorScheme].border,
        },
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '타이머',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'timer', android: 'schedule', web: 'schedule' }} tintColor={color} size={26} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: '통계',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' }} tintColor={color} size={26} />
          ),
        }}
      />
      <Tabs.Screen
        name="subjects"
        options={{
          title: '과목',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'book.fill', android: 'menu_book', web: 'menu_book' }} tintColor={color} size={26} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '설정',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'gearshape.fill', android: 'settings', web: 'settings' }} tintColor={color} size={26} />
          ),
        }}
      />
    </Tabs>
  );
}
