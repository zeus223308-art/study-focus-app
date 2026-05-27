import { Pressable, StyleSheet, Text } from 'react-native';

import { theme } from '@/constants/theme';

type Props = {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
};

/** Header / tile archive affordance — same for every subject folder. */
export function SubjectArchiveHeaderButton({ label, onPress, accessibilityLabel }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.btn}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.grayLight,
    backgroundColor: theme.surface,
  },
  text: {
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.black,
  },
});
