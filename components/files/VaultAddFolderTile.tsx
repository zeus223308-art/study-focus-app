import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { VAULT_PREVIEW_HEIGHT } from '@/lib/ui/viewport-layout';

type Props = {
  width: number;
  label: string;
  onPress: () => void;
};

/** Trailing “+ add folder” slot — layout matches SubjectFolderTile + SubjectFolderName. */
export function VaultAddFolderTile({ width, label, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, { width }, pressed && styles.pressed]}>
      <View style={styles.nameRow} />
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
    gap: 6,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', touchAction: 'manipulation' } as object) : null),
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
