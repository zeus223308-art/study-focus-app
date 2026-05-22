import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { theme } from '@/constants/theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  style?: ViewStyle;
  disabled?: boolean;
};

export function Button({ label, onPress, variant = 'primary', style, disabled }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        pressed && { opacity: 0.85 },
        disabled && { opacity: 0.5 },
        style,
      ]}>
      <Text
        style={[
          styles.text,
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
  primary: { backgroundColor: theme.accent },
  secondary: { backgroundColor: theme.white, borderWidth: 1, borderColor: theme.grayLight },
  ghost: { backgroundColor: 'transparent' },
  text: { fontSize: 16, fontWeight: '600' },
  textPrimary: { color: theme.white },
  textSecondary: { color: theme.black },
  textGhost: { color: theme.accent },
});
