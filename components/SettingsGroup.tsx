import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { WEB_LINE, webHairlineBottom } from '@/lib/ui/web-divider';
import { settingsGroupTitleWeb, settingsRowBoxWeb } from '@/lib/ui/settings-row-web';
import { settingsRowPad, useViewportLayout } from '@/lib/ui/viewport-layout';

export function SettingsGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.wrap}>
      {title ? <Text style={[styles.title, settingsGroupTitleWeb()]}>{title}</Text> : null}
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
  const viewport = useViewportLayout();
  const rowPad = settingsRowPad(viewport.isPhone);

  const content = (
    <>
      <Text style={styles.label}>{label}</Text>
      {right ?? (value ? <Text style={styles.value}>{value}</Text> : null)}
    </>
  );

  const rowBox = settingsRowBoxWeb(!!right);

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={[styles.row, rowBox, { paddingHorizontal: rowPad }, !last && styles.rowBorder]}>
        {content}
      </Pressable>
    );
  }

  return (
    <View style={[styles.row, rowBox, { paddingHorizontal: rowPad }, !last && styles.rowBorder]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.gray,
    marginBottom: 6,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  group: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: WEB_LINE,
    borderColor: theme.grayLight,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    minHeight: 42,
  },
  rowBorder: webHairlineBottom,
  label: { fontSize: theme.font.body, fontWeight: '600', color: theme.black },
  value: { fontSize: theme.font.body, fontWeight: '600', color: theme.gray },
});

export const settingsGroupStyles = styles;
