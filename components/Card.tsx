import { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const scheme = useColorScheme() ?? 'light';
  return (
    <View style={[styles.card, { backgroundColor: Colors[scheme].card, borderColor: Colors[scheme].border }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
});
