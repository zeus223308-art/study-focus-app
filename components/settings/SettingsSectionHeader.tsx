import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

type Props = {
  title: string;
  onHelpPress?: () => void;
  helpAccessibilityLabel?: string;
};

/** Uppercase section label with optional circular ? help button. */
export function SettingsSectionHeader({ title, onHelpPress, helpAccessibilityLabel }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {onHelpPress ? (
        <Pressable
          onPress={onHelpPress}
          style={styles.helpBtn}
          accessibilityRole="button"
          accessibilityLabel={helpAccessibilityLabel ?? title}>
          <Text style={styles.helpText}>?</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const LABEL_SIZE = theme.font.label;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    marginLeft: 4,
  },
  title: {
    fontSize: LABEL_SIZE,
    fontWeight: '600',
    color: theme.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  helpBtn: {
    width: LABEL_SIZE + 6,
    height: LABEL_SIZE + 6,
    borderRadius: (LABEL_SIZE + 6) / 2,
    borderWidth: 1.5,
    borderColor: theme.graySecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpText: {
    fontSize: LABEL_SIZE - 1,
    fontWeight: '700',
    color: theme.graySecondary,
    lineHeight: LABEL_SIZE,
    marginTop: -1,
  },
});
