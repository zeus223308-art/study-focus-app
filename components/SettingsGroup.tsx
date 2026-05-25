import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

export function SettingsGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.wrap}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.group}>{children}</View>
    </View>
  );
}

export function SettingsRow({
  label,
  value,
  onPress,
  right,
  last,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
  last?: boolean;
}) {
  const content = (
    <>
      <Text style={styles.label}>{label}</Text>
      {right ?? (value ? <Text style={styles.value}>{value}</Text> : null)}
    </>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={[styles.row, !last && styles.rowBorder]}>
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.row, !last && styles.rowBorder]}>{content}</View>;
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 24 },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.gray,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  group: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.grayLight,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.grayLight },
  label: { fontSize: theme.font.body, fontWeight: '600', color: theme.black },
  value: { fontSize: theme.font.body, fontWeight: '600', color: theme.gray },
});
