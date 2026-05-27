import { Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';

type Props = {
  visible: boolean;
  title: string;
  hint: string;
  name: string;
  placeholder: string;
  sendLabel: string;
  cancelLabel: string;
  onChangeName: (value: string) => void;
  onSend: () => void;
  onClose: () => void;
};

export function SendToNewFolderModal({
  visible,
  title,
  hint,
  name,
  placeholder,
  sendLabel,
  cancelLabel,
  onChangeName,
  onSend,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const canSend = name.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.card, { marginBottom: Math.max(24, insets.bottom) }]}
          onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.hint}>{hint}</Text>
          <TextInput
            value={name}
            onChangeText={onChangeName}
            placeholder={placeholder}
            autoFocus
            maxLength={40}
            returnKeyType="done"
            onSubmitEditing={canSend ? onSend : undefined}
            style={styles.input}
            {...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {})}
          />
          <View style={styles.actions}>
            <Pressable style={[styles.btn, styles.btnCancel]} onPress={onClose}>
              <Text style={styles.btnCancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnSend, !canSend && styles.btnDisabled]}
              onPress={canSend ? onSend : undefined}
              disabled={!canSend}>
              <Text style={styles.btnSendText}>{sendLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    ...Platform.select({
      web: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0 },
      default: {},
    }),
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.beige,
    borderRadius: theme.radius.lg,
    padding: 22,
    gap: 12,
  },
  title: {
    fontSize: theme.font.heading,
    fontWeight: '800',
    color: theme.black,
    textAlign: 'center',
  },
  hint: {
    fontSize: theme.font.bodySmall,
    color: theme.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
  input: {
    fontSize: theme.font.body,
    borderWidth: 1.5,
    borderColor: theme.grayLight,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: theme.surface,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  btnCancel: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.grayLight,
  },
  btnSend: {
    backgroundColor: theme.orange,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnCancelText: {
    fontWeight: '700',
    color: theme.black,
  },
  btnSendText: {
    fontWeight: '800',
    color: theme.white,
  },
});
