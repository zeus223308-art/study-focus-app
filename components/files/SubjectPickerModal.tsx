import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import type { SubjectFolder } from '@/lib/domain/types';

type Props = {
  visible: boolean;
  title: string;
  hint: string;
  subjects: SubjectFolder[];
  selectedId: string | null;
  confirmLabel: string;
  cancelLabel: string;
  onSelect: (subjectId: string) => void;
  onConfirm: () => void;
  onClose: () => void;
};

export function SubjectPickerModal({
  visible,
  title,
  hint,
  subjects,
  selectedId,
  confirmLabel,
  cancelLabel,
  onSelect,
  onConfirm,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const canConfirm = selectedId != null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(20, insets.bottom) }]}
          onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.hint}>{hint}</Text>
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {subjects.map((subject) => {
              const checked = selectedId === subject.id;
              return (
                <Pressable
                  key={subject.id}
                  onPress={() => onSelect(subject.id)}
                  style={[styles.row, checked && styles.rowOn]}>
                  <View style={[styles.checkbox, checked && styles.checkboxOn]}>
                    {checked ? (
                      <SymbolView
                        name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                        size={14}
                        tintColor={theme.white}
                      />
                    ) : null}
                  </View>
                  <Text style={styles.rowLabel} numberOfLines={1}>
                    {subject.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.actions}>
            <Pressable style={[styles.btn, styles.btnCancel]} onPress={onClose}>
              <Text style={styles.btnCancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnConfirm, !canConfirm && styles.btnDisabled]}
              onPress={canConfirm ? onConfirm : undefined}
              disabled={!canConfirm}>
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
    justifyContent: 'flex-end',
    ...Platform.select({
      web: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0 },
      default: {},
    }),
  },
  sheet: {
    maxHeight: '72%',
    backgroundColor: theme.beige,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 10,
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
  list: {
    maxHeight: 320,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.grayLight,
    backgroundColor: theme.surface,
    marginBottom: 8,
  },
  rowOn: {
    borderColor: theme.orange,
    backgroundColor: theme.orangeMuted,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.grayLight,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: theme.orange,
    borderColor: theme.orange,
  },
  rowLabel: {
    flex: 1,
    fontSize: theme.font.body,
    fontWeight: '700',
    color: theme.black,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
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
  },
  btnConfirmText: {
    fontWeight: '800',
    color: theme.white,
  },
});
