import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
};

function GoogleMark() {
  return (
    <View style={styles.mark}>
      <Text style={styles.markG}>G</Text>
    </View>
  );
}

export function GoogleSignInButton({ label, onPress, disabled, loading }: Props) {
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={inactive ? undefined : onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.btn,
        Platform.OS === 'web' && styles.btnWeb,
        inactive && styles.btnDisabled,
        pressed && !inactive && styles.btnPressed,
      ]}
      disabled={inactive}>
      {loading ? (
        <>
          <ActivityIndicator color={theme.gray} size="small" />
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
        </>
      ) : (
        <>
          <GoogleMark />
          <Text style={[styles.label, inactive && styles.labelDisabled]} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.grayLight,
    backgroundColor: theme.surface,
    minHeight: 40,
    width: '100%',
    maxWidth: 240,
    zIndex: 2,
  },
  btnWeb: {
    cursor: 'pointer',
    userSelect: 'none',
  } as object,
  btnDisabled: {
    backgroundColor: theme.beige,
    opacity: 0.85,
    ...(Platform.OS === 'web' ? ({ cursor: 'not-allowed' } as object) : null),
  },
  btnPressed: {
    backgroundColor: theme.beige,
  },
  mark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markG: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4285F4',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.black,
    flexShrink: 1,
  },
  labelDisabled: {
    color: theme.graySecondary,
  },
});
