import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import type { SubjectFolder } from '@/lib/domain/types';

type Props = {
  visible: boolean;
  subjects: SubjectFolder[];
  currentSubjectId: string;
  onConfirm: (subjectId: string) => void;
  onClose: () => void;
};

export function ArchiveSubjectPickerModal({
  visible,
  subjects,
  currentSubjectId,
  onConfirm,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [pickedId, setPickedId] = useState(currentSubjectId);

  useEffect(() => {
    if (visible) setPickedId(currentSubjectId);
  }, [visible, currentSubjectId]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
          onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{t('item.archivePickTitle')}</Text>
          <Text style={styles.sub}>{t('item.archivePickBody')}</Text>
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {subjects.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => setPickedId(s.id)}
                style={[styles.row, s.id === pickedId && styles.rowSelected]}>
                <Text style={styles.rowText}>{s.name}</Text>
                {s.id === currentSubjectId ? (
                  <Text style={styles.badge}>{t('item.archiveCurrentSubject')}</Text>
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
          <Button
            label={t('common.confirm')}
            onPress={() => onConfirm(pickedId)}
            style={styles.confirmBtn}
          />
          <Pressable onPress={onClose} style={styles.cancel}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.beige,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    paddingTop: 20,
    paddingHorizontal: 20,
    maxHeight: '70%',
  },
  title: { fontSize: theme.font.heading, fontWeight: '800', color: theme.black },
  sub: {
    marginTop: 6,
    marginBottom: 12,
    fontSize: theme.font.caption,
    color: theme.gray,
    fontWeight: '600',
  },
  list: { maxHeight: 320 },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.grayLight,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowSelected: { borderColor: theme.orange, borderWidth: 2 },
  rowText: { fontWeight: '700', color: theme.black, flex: 1 },
  badge: { fontSize: 11, fontWeight: '700', color: theme.orange },
  confirmBtn: { marginTop: 4 },
  cancel: { marginTop: 8, alignItems: 'center', paddingVertical: 12 },
  cancelText: { color: theme.gray, fontWeight: '700' },
});
