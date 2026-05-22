import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import type { DateStack } from '@/lib/grouping';

type Props = {
  stack: DateStack;
  onPress: () => void;
};

export function DateStackCard({ stack, onPress }: Props) {
  const cover = stack.items[0];
  const count = stack.items.length;

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.thumbWrap}>
        <Image source={{ uri: cover.imageUri }} style={styles.thumb} />
        {count > 1 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count}</Text>
          </View>
        )}
      </View>
      <Text style={styles.date}>{stack.studyDate}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: '48%', marginBottom: 16 },
  thumbWrap: {
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.grayLight,
  },
  thumb: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: theme.black,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: theme.white, fontSize: 12, fontWeight: '700' },
  date: { marginTop: 8, fontSize: theme.font.bodySmall, color: theme.black, fontWeight: '700' },
});
