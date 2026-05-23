import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

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
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.btn,
        disabled && styles.btnDisabled,
        pressed && !disabled && styles.btnPressed,
      ]}
      disabled={disabled || loading}>
      {loading ? (
        <ActivityIndicator color={theme.gray} size="small" />
      ) : (
        <>
          <GoogleMark />
          <Text style={[styles.label, disabled && styles.labelDisabled]} numberOfLines={1}>
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
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.grayLight,
    backgroundColor: theme.white,
    minHeight: 36,
    flexShrink: 1,
  },
  btnDisabled: {
    backgroundColor: theme.beige,
    opacity: 0.72,
  },
  btnPressed: {
    backgroundColor: theme.beige,
  },
  mark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.white,
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
