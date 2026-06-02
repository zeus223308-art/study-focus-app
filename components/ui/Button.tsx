import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { theme } from '@/constants/theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'default' | 'compact';
  /** `fit` — shrink to parent column instead of stretching full screen width. */
  layout?: 'fill' | 'fit';
  style?: ViewStyle;
  disabled?: boolean;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'default',
  layout = 'fill',
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
        layout === 'fit' && styles.fit,
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
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: theme.radius.sm,
    minHeight: 36,
  },
  fit: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: '100%',
  },
  primary: { backgroundColor: theme.orange },
  primaryPressed: { backgroundColor: theme.gray },
  secondary: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.grayLight },
  ghost: { backgroundColor: 'transparent' },
  text: { fontSize: theme.font.body, fontWeight: '700' },
  textCompact: { fontSize: theme.font.caption, fontWeight: '700' },
  textPrimary: { color: theme.onAccent },
  textSecondary: { color: theme.black },
  textGhost: { color: theme.orange },
});
