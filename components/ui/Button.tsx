import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { theme } from '@/constants/theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'default' | 'compact';
  style?: ViewStyle;
  disabled?: boolean;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'default',
  style,
  disabled,
}: Props) {
  const compact = size === 'compact';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        compact && styles.baseCompact,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        pressed && (variant === 'primary' ? styles.primaryPressed : { opacity: 0.85 }),
        disabled && { opacity: 0.5 },
        style,
      ]}>
      <Text
        style={[
          styles.text,
          compact && styles.textCompact,
          variant === 'primary' && styles.textPrimary,
          variant === 'secondary' && styles.textSecondary,
          variant === 'ghost' && styles.textGhost,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  baseCompact: {
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: theme.radius.sm,
    minHeight: 38,
  },
  primary: { backgroundColor: theme.orange },
  primaryPressed: { backgroundColor: theme.gray },
  secondary: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.grayLight },
  ghost: { backgroundColor: 'transparent' },
  text: { fontSize: theme.font.body, fontWeight: '700' },
  textCompact: { fontSize: theme.font.bodySmall, fontWeight: '700' },
  textPrimary: { color: theme.onAccent },
  textSecondary: { color: theme.black },
  textGhost: { color: theme.orange },
});
