import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import { webHairlineTop } from '@/lib/ui/web-divider';
import { stopSheetPress, webFixedBackdropStyle } from '@/lib/ui/web-fixed-overlay';
import { BUTTON_LABEL_DEFAULT, BUTTON_LABEL_LINK } from '@/lib/ui/button-label';

type Props = {
  visible: boolean;
  sendToNewFolderLabel: string;
  reorderLabel: string;
  cancelLabel: string;
  onSendToNewFolder: () => void;
  onReorder: () => void;
  onClose: () => void;
};

/** Long-press menu on folder album photos. */
export function PhotoHoldMenuSheet({
  visible,
  sendToNewFolderLabel,
  reorderLabel,
  cancelLabel,
  onSendToNewFolder,
  onReorder,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(28, insets.bottom + 12) }]}
          onPress={stopSheetPress}>
          <View style={styles.handle} />
          <Pressable style={styles.row} onPress={onSendToNewFolder}>
            <Text style={styles.rowText}>{sendToNewFolderLabel}</Text>
          </Pressable>
          <Pressable style={[styles.row, styles.rowBorder]} onPress={onReorder}>
            <Text style={styles.rowText}>{reorderLabel}</Text>
          </Pressable>
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
  rowBorder: webHairlineTop,
  rowText: {
    ...BUTTON_LABEL_DEFAULT,
    color: theme.black,
  },
  cancelRow: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
    ...webHairlineTop,
  },
  cancelText: {
    ...BUTTON_LABEL_LINK,
    color: theme.gray,
  },
});
