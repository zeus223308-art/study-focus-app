import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { theme } from '@/constants/theme';

type Props = {
  title: string;
  showSettings?: boolean;
  right?: React.ReactNode;
};

export function ScreenHeader({ title, showSettings = true, right }: Props) {
  const router = useRouter();

  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
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
  },
  title: { fontSize: theme.font.title, fontWeight: '800', color: theme.black, letterSpacing: -0.3 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gear: { padding: 4 },
});
