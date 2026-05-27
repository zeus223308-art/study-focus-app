import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs/types';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import { useCaptureLeaveGuard } from '@/components/capture/CaptureLeaveGuard';

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
  const { requestLeave } = useCaptureLeaveGuard();

  const items = DOCK_ORDER.map((routeName) => ({
    routeName,
    label: t(DOCK_LABELS[routeName]),
  }));

  return (
    <View
      style={[
        styles.wrapper,
        { paddingTop: insets.top + DOCK_EDGE_GAP, paddingHorizontal: DOCK_EDGE_GAP },
      ]}
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
                  const navigate = () => {
                    const event = navigation.emit({
                      type: 'tabPress',
                      target: state.routes[routeIndex].key,
                      canPreventDefault: true,
                    });
                    if (!focused && !event.defaultPrevented) {
                      navigation.navigate(item.routeName);
                    }
                  };

                  const currentRoute = state.routes[state.index]?.name;
                  if (currentRoute === 'capture' && requestLeave(navigate)) {
                    return;
                  }

                  navigate();
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
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    zIndex: 90,
    elevation: 90,
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'stretch',
    alignSelf: 'stretch',
    width: '100%',
    backgroundColor: theme.dock,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.dockDivider,
    minHeight: DOCK_HEIGHT,
    overflow: 'hidden',
    paddingHorizontal: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
      },
      android: { elevation: 10 },
      web: { boxShadow: '0 8px 32px rgba(0,0,0,0.45)' } as object,
      default: {},
    }),
  },
  segmentWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  segment: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
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
    width: '100%',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  labelFocused: {
    fontWeight: '800',
  },
});
