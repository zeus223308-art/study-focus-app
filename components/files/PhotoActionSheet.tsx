import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import { webHairlineTop } from '@/lib/ui/web-divider';
import { stopSheetPress, webFixedBackdropStyle } from '@/lib/ui/web-fixed-overlay';
import { BUTTON_LABEL_DEFAULT, BUTTON_LABEL_LINK } from '@/lib/ui/button-label';

type Props = {
  visible: boolean;
  restoreLabel: string;
  saveToArchiveLabel: string;
  deleteLabel?: string;
  cancelLabel: string;
  onRestore: () => void;
  onSaveToArchive: () => void;
  onDelete?: () => void;
  onClose: () => void;
  hideSaveToArchive?: boolean;
  hideRestore?: boolean;
};

export function PhotoActionSheet({
  visible,
  restoreLabel,
  saveToArchiveLabel,
  deleteLabel,
  cancelLabel,
  onRestore,
  onSaveToArchive,
  onDelete,
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
          onPress={stopSheetPress}>
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
          {onDelete && deleteLabel ? (
            <Pressable
              style={[styles.row, (!hideRestore || !hideSaveToArchive) && styles.rowBorder]}
              onPress={onDelete}>
              <Text style={[styles.rowText, styles.deleteText]}>{deleteLabel}</Text>
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
    ...webFixedBackdropStyle,
  },
  sheet: {
    backgroundColor: theme.beige,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    paddingTop: 10,
    paddingHorizontal: 24,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 320,
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
    paddingVertical: 11,
    alignItems: 'center',
  },
  rowBorder: webHairlineTop,
  rowText: {
    ...BUTTON_LABEL_DEFAULT,
    color: theme.black,
  },
  deleteText: {
    color: theme.orange,
  },
  cancelRow: {
    marginTop: 6,
    paddingVertical: 10,
    alignItems: 'center',
    ...webHairlineTop,
  },
  cancelText: {
    ...BUTTON_LABEL_LINK,
    color: theme.gray,
  },
});
