import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { VAULT_PREVIEW_HEIGHT } from '@/lib/ui/viewport-layout';

type Props = {
  width: number;
  label: string;
  onPress: () => void;
};

/** Trailing “+ add subject” slot — label inside dashed preview card (matches vault folder tiles). */
export function VaultAddFolderTile({ width, label, onPress }: Props) {
  return (
    <View style={[styles.wrap, { width }]} {...(Platform.OS === 'web' ? { dataSet: { vaultTile: '1' } } : {})}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={label}>
        <Text style={styles.plus}>+</Text>
        <Text style={styles.label} numberOfLines={2}>
          {label}
        </Text>
      </Pressable>
      {/* Align with SubjectFolderName belowPreview row under other vault tiles */}
      <View style={styles.nameSpacer} />
    </View>
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
  card: {
    width: '100%',
    height: VAULT_PREVIEW_HEIGHT,
    borderRadius: theme.radius.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.orange,
    backgroundColor: theme.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 4,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', touchAction: 'manipulation' } as object) : null),
  },
  plus: {
    fontSize: 22,
    fontWeight: '300',
    color: theme.orange,
    lineHeight: 26,
  },
  label: {
    fontSize: theme.font.bodySmall,
    fontWeight: '800',
    color: theme.black,
    textAlign: 'center',
    lineHeight: 18,
  },
  nameSpacer: {
    marginTop: 6,
    minHeight: 20,
  },
});
