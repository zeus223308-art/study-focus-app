import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { contrastTextColor } from '@/lib/ui/tag-colors';

type Props = {
  tags: string[];
  /** Global tag color (same as photo ribbons). */
  color: string;
  activeTag: string | null;
  onSelect: (tag: string | null) => void;
};

/** Horizontal row of tag chips; tap toggles a filter for matching photos. */
export function TagFilterBar({ tags, color, activeTag, onSelect }: Props) {
  if (tags.length === 0) return null;
  const textColor = contrastTextColor(color);

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        {tags.map((tag) => {
          const active = tag === activeTag;
          return (
            <Pressable
              key={tag}
              onPress={() => onSelect(active ? null : tag)}
              style={[styles.chip, { backgroundColor: color }, active && styles.chipActive]}>
              <Text style={[styles.chipText, { color: textColor }]} numberOfLines={1}>
                {tag}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 4 },
  row: { gap: 8, paddingVertical: 2, paddingRight: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipActive: { borderColor: theme.black },
  chipText: { fontSize: theme.font.bodySmall, fontWeight: '800' },
});
