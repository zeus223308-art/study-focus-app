import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import {
  VAULT_PREVIEW_HEIGHT,
  VAULT_TILE_HEIGHT,
} from '@/lib/ui/viewport-layout';

type Props = {
  width: number;
  label: string;
  onPress: () => void;
};

/** Trailing “+ add folder” slot in the Files carousel row. */
export function VaultAddFolderTile({ width, label, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrap,
        { width },
        pressed && styles.pressed,
      ]}>
      <View style={styles.nameSpacer} />
      <View style={styles.card}>
        <Text style={styles.plus}>+</Text>
        <Text style={styles.label} numberOfLines={2}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: VAULT_TILE_HEIGHT,
  },
  pressed: {
    opacity: 0.85,
  },
  nameSpacer: {
    height: 32,
    marginBottom: 8,
  },
  card: {
    minHeight: VAULT_PREVIEW_HEIGHT,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.orange,
    backgroundColor: theme.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 6,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null),
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
