import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

type Props = {
  name: string;
  count: number;
  color: string;
  onPress: () => void;
  totalLabel: string;
};

export function SubjectReviewCard({ name, count, color, onPress, totalLabel }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { borderLeftColor: color },
        pressed && styles.pressed,
      ]}>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.count}>{totalLabel}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 120,
    backgroundColor: theme.white,
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: theme.grayLight,
    justifyContent: 'center',
    ...theme.cardShadow,
  },
  pressed: { opacity: 0.92 },
  name: { fontSize: theme.font.heading, fontWeight: '800', color: theme.black },
  count: { fontSize: theme.font.bodySmall, fontWeight: '600', color: theme.gray, marginTop: 10 },
});
