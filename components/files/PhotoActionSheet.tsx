import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';

type Props = {
  visible: boolean;
  restoreLabel: string;
  saveToArchiveLabel: string;
  cancelLabel: string;
  onRestore: () => void;
  onSaveToArchive: () => void;
  onClose: () => void;
  hideSaveToArchive?: boolean;
  hideRestore?: boolean;
};

export function PhotoActionSheet({
  visible,
  restoreLabel,
  saveToArchiveLabel,
  cancelLabel,
  onRestore,
  onSaveToArchive,
  onClose,
  hideSaveToArchive,
  hideRestore,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(28, insets.bottom + 12) }]}
          onPress={() => {}}>
          <View style={styles.handle} />
          {!hideRestore ? (
            <Pressable style={styles.row} onPress={onRestore}>
              <Text style={styles.rowText}>{restoreLabel}</Text>
            </Pressable>
          ) : null}
          {!hideSaveToArchive ? (
            <Pressable style={[styles.row, !hideRestore && styles.rowBorder]} onPress={onSaveToArchive}>
              <Text style={styles.rowText}>{saveToArchiveLabel}</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.cancelRow} onPress={onClose}>
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.beige,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.grayLight,
    alignSelf: 'center',
    marginBottom: 12,
  },
  row: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.grayLight,
  },
  rowText: {
    fontSize: theme.font.body,
    fontWeight: '700',
    color: theme.black,
  },
  cancelRow: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.grayLight,
  },
  cancelText: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.gray,
  },
});
