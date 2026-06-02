import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { BUTTON_LABEL_COMPACT } from '@/lib/ui/button-label';

export type FolderPhotoAction = {
  key: string;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
};

type Props = {
  actions: FolderPhotoAction[];
};

/** Compact pill row — matches subject dock chips, not full-width bars. */
export function FolderPhotoActionBar({ actions }: Props) {
  const main = actions.filter((a) => a.variant !== 'ghost');
  const ghost = actions.filter((a) => a.variant === 'ghost');

  return (
    <View
      style={styles.wrap}
      {...({ dataSet: { folderActionBar: '1' } } as object)}>
      {main.length > 0 ? (
        <View style={styles.row}>
          {main.map((action) => {
            const variant = action.variant ?? 'primary';
            return (
              <Pressable
                key={action.key}
                disabled={action.disabled}
                onPress={action.onPress}
                accessibilityRole="button"
                {...({ dataSet: { folderActionBtn: '1' } } as object)}
                style={({ pressed }) => [
                  styles.chip,
                  variant === 'primary' && styles.primary,
                  variant === 'secondary' && styles.secondary,
                  action.disabled && styles.disabled,
                  pressed && styles.pressed,
                ]}>
                <Text
                  style={[
                    styles.label,
                    variant === 'primary' && styles.labelPrimary,
                  ]}
                  numberOfLines={2}>
                  {action.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {ghost.map((action) => (
        <Pressable
          key={action.key}
          disabled={action.disabled}
          onPress={action.onPress}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.ghost,
            action.disabled && styles.disabled,
            pressed && styles.pressed,
          ]}>
          <Text style={styles.ghostLabel}>{action.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    alignItems: 'center',
    maxWidth: '100%',
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    maxWidth: '100%',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 148,
  },
  primary: {
    backgroundColor: theme.orange,
  },
  secondary: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.grayLight,
  },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.88 },
  label: {
    ...BUTTON_LABEL_COMPACT,
    fontWeight: '800',
    color: theme.black,
    textAlign: 'center',
  },
  labelPrimary: { color: theme.onAccent },
  ghost: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  ghostLabel: {
    ...BUTTON_LABEL_COMPACT,
    fontWeight: '600',
    color: theme.gray,
    textAlign: 'center',
  },
});
