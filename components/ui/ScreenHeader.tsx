import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { theme } from '@/constants/theme';
import { safeRouterBack } from '@/lib/navigation/safe-back';

type Props = {
  title: string;
  showBack?: boolean;
  /** Used when there is no screen to pop (e.g. opened folder from tabs on web). */
  backFallback?: Href;
  showSettings?: boolean;
  right?: React.ReactNode;
  /** Placed between title and settings (e.g. folder import). */
  center?: React.ReactNode;
};

export function ScreenHeader({
  title,
  showBack = false,
  backFallback,
  showSettings = true,
  right,
  center,
}: Props) {
  const router = useRouter();
  const { t } = useTranslation();

  const backButton = showBack ? (
    <Pressable
      onPress={() => safeRouterBack(router, backFallback)}
      hitSlop={12}
      style={styles.backBtn}
      accessibilityLabel={t('common.back')}>
      <SymbolView
        name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
        size={22}
        tintColor={theme.black}
      />
    </Pressable>
  ) : null;

  if (center) {
    return (
      <View style={styles.rowThree}>
        {backButton}
        <Text style={styles.titleFlex} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.centerSlot}>{center}</View>
        <View style={styles.rightEnd}>
          {right}
          {showSettings && (
            <Pressable
              onPress={() => router.push('/(tabs)/settings')}
              hitSlop={12}
              style={styles.gear}>
              <SymbolView
                name={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
                size={22}
                tintColor={theme.black}
              />
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {backButton}
        <Text style={[styles.title, showBack && styles.titleWithBack]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View style={styles.right}>
        {right}
        {showSettings && (
          <Pressable
            onPress={() => router.push('/(tabs)/settings')}
            hitSlop={12}
            style={styles.gear}>
            <SymbolView
              name={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
              size={22}
              tintColor={theme.black}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  rowThree: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  left: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backBtn: {
    padding: 4,
    marginRight: 2,
  },
  title: { fontSize: theme.font.title, fontWeight: '800', color: theme.black, letterSpacing: -0.3 },
  titleWithBack: { flex: 1 },
  titleFlex: {
    flex: 1,
    minWidth: 0,
    fontSize: theme.font.heading,
    fontWeight: '800',
    color: theme.black,
    letterSpacing: -0.3,
  },
  centerSlot: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightEnd: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gear: { padding: 4 },
});
