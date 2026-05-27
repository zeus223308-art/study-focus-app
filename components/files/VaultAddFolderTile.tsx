import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { VAULT_PREVIEW_HEIGHT } from '@/lib/ui/viewport-layout';

type Props = {
  label: string;
  onPress: () => void;
};

/** Trailing “add subject” slot — same layout stack as {@link SubjectFolderTile}. */
export function VaultAddFolderTile({ label, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <View style={styles.nameRow} />
      <View style={styles.previewSlot}>
        <View style={styles.card}>
          <Text style={styles.plus}>+</Text>
          <Text style={styles.label} numberOfLines={2}>
            {label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    minWidth: 0,
  },
  pressed: {
    opacity: 0.85,
  },
  nameRow: {
    marginBottom: 8,
    marginLeft: 2,
    marginRight: 2,
    minHeight: 24,
  },
  previewSlot: {
    width: '100%',
    borderRadius: theme.radius.sm,
    ...(Platform.OS === 'web'
      ? ({ cursor: 'pointer', touchAction: 'manipulation', userSelect: 'none' } as object)
      : null),
  },
  card: {
    width: '100%',
    height: VAULT_PREVIEW_HEIGHT,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.orange,
    backgroundColor: theme.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 6,
  },
  plus: {
    fontSize: 28,
    fontWeight: '300',
    color: theme.orange,
    lineHeight: 30,
  },
  label: {
    fontSize: theme.font.caption,
    fontWeight: '800',
    color: theme.orange,
    textAlign: 'center',
  },
});
