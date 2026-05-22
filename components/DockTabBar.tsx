import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';

export const DOCK_EDGE_GAP = 12;
export const DOCK_HEIGHT = 48;
/** Space to reserve below the top dock (safe area + dock + gap). */
export const dockTopContentInset = (safeTop: number) =>
  safeTop + DOCK_EDGE_GAP + DOCK_HEIGHT + 8;

/** Left → center → right */
const DOCK_ORDER = ['vault', 'index', 'settings'] as const;

const DOCK_LABELS: Record<(typeof DOCK_ORDER)[number], 'tabs.vault' | 'tabs.dashboard' | 'tabs.settings'> = {
  vault: 'tabs.vault',
  index: 'tabs.dashboard',
  settings: 'tabs.settings',
};

export function DockTabBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const items = DOCK_ORDER.map((routeName) => ({
    routeName,
    label: t(DOCK_LABELS[routeName]),
  }));

  return (
    <View
      style={[styles.wrapper, { paddingTop: insets.top + DOCK_EDGE_GAP }]}
      pointerEvents="box-none">
      <View style={styles.dock}>
        {items.map((item, index) => {
          const routeIndex = state.routes.findIndex((r) => r.name === item.routeName);
          const focused = state.index === routeIndex;
          const color = focused ? theme.orange : theme.gray;

          return (
            <View key={item.routeName} style={styles.segmentWrap}>
              {index > 0 && <View style={styles.dividerTrack}>
                <View style={styles.divider} />
              </View>}
              <Pressable
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                accessibilityLabel={item.label}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: state.routes[routeIndex].key,
                    canPreventDefault: true,
                  });
                  if (!focused && !event.defaultPrevented) {
                    navigation.navigate(item.routeName);
                  }
                }}
                style={({ pressed }) => [styles.segment, pressed && styles.segmentPressed]}>
                <Text style={[styles.label, { color }, focused && styles.labelFocused]}>{item.label}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 90,
    elevation: 90,
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: theme.dock,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(61, 56, 50, 0.1)',
    minHeight: DOCK_HEIGHT,
    overflow: 'hidden',
    paddingHorizontal: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
      android: { elevation: 10 },
      web: { boxShadow: '0 8px 32px rgba(0,0,0,0.12)' } as object,
      default: {},
    }),
  },
  segmentWrap: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    minWidth: 88,
  },
  dividerTrack: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 11,
  },
  divider: {
    width: 1,
    height: 24,
    borderRadius: 1,
    backgroundColor: theme.dockDivider,
  },
  segmentPressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  labelFocused: {
    fontWeight: '800',
  },
});
