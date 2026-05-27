import { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import type { SubjectFolder } from '@/lib/domain/types';

type Props = {
  visible: boolean;
  title: string;
  nameLabel: string;
  namePlaceholder: string;
  subjectLabel: string;
  confirmLabel: string;
  cancelLabel: string;
  subjects: SubjectFolder[];
  initialSubjectId: string;
  onCancel: () => void;
  onConfirm: (title: string, subjectId: string) => void;
};

export function SplitToNewFolderModal({
  visible,
  title,
  nameLabel,
  namePlaceholder,
  subjectLabel,
  confirmLabel,
  cancelLabel,
  subjects,
  initialSubjectId,
  onCancel,
  onConfirm,
}: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [subjectId, setSubjectId] = useState(initialSubjectId);

  useEffect(() => {
    if (visible) {
      setName('');
      setSubjectId(initialSubjectId);
    }
  }, [visible, initialSubjectId]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed || !subjectId) return;
    onConfirm(trimmed, subjectId);
  };

  const sorted = [...subjects].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
      statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(20, insets.bottom + 12) }]}
          onPress={() => {}}>
          <Text style={styles.heading}>{title}</Text>
          <Text style={styles.label}>{nameLabel}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={namePlaceholder}
            autoFocus
            maxLength={80}
            style={styles.input}
            {...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {})}
          />
          <Text style={[styles.label, styles.subjectLabel]}>{subjectLabel}</Text>
          <ScrollView style={styles.subjectList} keyboardShouldPersistTaps="handled">
            {sorted.map((s) => {
              const selected = s.id === subjectId;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => setSubjectId(s.id)}
                  style={[styles.subjectRow, selected && styles.subjectRowOn]}>
                  <Text style={[styles.subjectName, selected && styles.subjectNameOn]}>
                    {s.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.actions}>
            <Pressable style={[styles.btn, styles.btnCancel]} onPress={onCancel}>
              <Text style={styles.btnCancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnConfirm, !name.trim() && styles.btnDisabled]}
              onPress={submit}
              disabled={!name.trim()}>
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
    backgroundColor: theme.beige,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: '85%',
  },
  heading: {
    fontSize: theme.font.heading,
    fontWeight: '800',
    color: theme.black,
    textAlign: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.gray,
    marginBottom: 6,
  },
  subjectLabel: {
    marginTop: 14,
  },
  input: {
    borderWidth: 1.5,
    borderColor: theme.grayLight,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: theme.font.body,
    backgroundColor: theme.surface,
  },
  subjectList: {
    maxHeight: 200,
    marginTop: 4,
  },
  subjectRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: theme.grayLight,
    backgroundColor: theme.surface,
  },
  subjectRowOn: {
    borderColor: theme.orange,
    backgroundColor: theme.orangeMuted,
  },
  subjectName: {
    fontSize: theme.font.body,
    fontWeight: '700',
    color: theme.black,
  },
  subjectNameOn: {
    color: theme.orange,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
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
