import { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { theme } from '@/constants/theme';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel: string;
  cancelLabel: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
};

export function TitleInputDialog({
  visible,
  title,
  message,
  placeholder,
  initialValue = '',
  confirmLabel,
  cancelLabel,
  onCancel,
  onConfirm,
}: Props) {
  const [draft, setDraft] = useState(initialValue);

  useEffect(() => {
    if (visible) setDraft(initialValue);
  }, [visible, initialValue]);

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
      presentationStyle="overFullScreen">
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={placeholder}
            autoFocus
            maxLength={80}
            returnKeyType="done"
            onSubmitEditing={submit}
            style={styles.input}
            {...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {})}
          />
          <View style={styles.actions}>
            <Pressable style={[styles.btn, styles.btnCancel]} onPress={onCancel}>
              <Text style={styles.btnCancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnConfirm, !draft.trim() && styles.btnDisabled]}
              onPress={submit}
              disabled={!draft.trim()}>
              <Text style={styles.btnConfirmText}>{confirmLabel}</Text>
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
    padding: 28,
    zIndex: 99999,
    ...Platform.select({
      web: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0 },
      default: {},
    }),
  },
  card: {
    width: '100%',
    maxWidth: 340,
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
  message: {
    fontSize: theme.font.body,
    color: theme.gray,
    textAlign: 'center',
    lineHeight: 22,
  },
  input: {
    borderWidth: 1.5,
    borderColor: theme.grayLight,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: theme.font.body,
    backgroundColor: theme.surface,
    color: theme.black,
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
  btnConfirm: {
    backgroundColor: theme.orange,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnCancelText: {
    fontWeight: '700',
    color: theme.black,
    fontSize: theme.font.body,
  },
  btnConfirmText: {
    fontWeight: '800',
    color: theme.white,
    fontSize: theme.font.body,
  },
});
