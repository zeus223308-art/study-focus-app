import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SendToNewFolderModal } from '@/components/files/SendToNewFolderModal';
import { theme } from '@/constants/theme';
import {
  canDeleteCaptureTagPreset,
  normalizeCaptureTagLabel,
  toggleCaptureTag,
} from '@/lib/domain/capture-tags';
import type { Language } from '@/lib/domain/types';

type Props = {
  presets: string[];
  selectedTags: string[];
  language: Language;
  onChangeSelected: (tags: string[]) => void;
  onAddPreset: (label: string) => void;
  onRemovePreset: (label: string) => void;
  disabled?: boolean;
};

function CaptureTagDeleteModal({
  visible,
  tag,
  title,
  hint,
  deleteLabel,
  cancelLabel,
  onDelete,
  onClose,
}: {
  visible: boolean;
  tag: string;
  title: string;
  hint: string;
  deleteLabel: string;
  cancelLabel: string;
  onDelete: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={modalStyles.backdrop} onPress={onClose}>
        <Pressable
          style={[modalStyles.card, { marginBottom: Math.max(24, insets.bottom) }]}
          onPress={() => {}}>
          <Text style={modalStyles.title}>{title}</Text>
          <Text style={modalStyles.hint}>{hint}</Text>
          <View style={modalStyles.tagPill}>
            <Text style={modalStyles.tagPillText}>{tag}</Text>
          </View>
          <View style={modalStyles.actions}>
            <Pressable style={[modalStyles.btn, modalStyles.btnCancel]} onPress={onClose}>
              <Text style={modalStyles.btnCancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable style={[modalStyles.btn, modalStyles.btnDelete]} onPress={onDelete}>
              <Text style={modalStyles.btnDeleteText}>{deleteLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function CaptureTagPicker({
  presets,
  selectedTags,
  language,
  onChangeSelected,
  onAddPreset,
  onRemovePreset,
  disabled,
}: Props) {
  const { t } = useTranslation();
  const [addVisible, setAddVisible] = useState(false);
  const [draftLabel, setDraftLabel] = useState('');
  const [deleteTag, setDeleteTag] = useState<string | null>(null);

  const isOn = (tag: string) =>
    selectedTags.some((s) => s.toLowerCase() === tag.toLowerCase());

  const closeAdd = () => {
    setAddVisible(false);
    setDraftLabel('');
  };

  const confirmAdd = () => {
    const trimmed = draftLabel.trim();
    if (!trimmed) return;
    onAddPreset(trimmed);
    onChangeSelected(toggleCaptureTag(selectedTags, trimmed));
    closeAdd();
  };

  const openDelete = (tag: string) => {
    if (disabled || !canDeleteCaptureTagPreset(tag, language)) return;
    setDeleteTag(tag);
  };

  const closeDelete = () => setDeleteTag(null);

  const confirmDelete = () => {
    if (!deleteTag) return;
    const label = deleteTag;
    onRemovePreset(label);
    const key = normalizeCaptureTagLabel(label).toLowerCase();
    onChangeSelected(selectedTags.filter((s) => s.toLowerCase() !== key));
    closeDelete();
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{t('capture.pickTags')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        {presets.map((tag) => {
          const deletable = canDeleteCaptureTagPreset(tag, language);
          return (
            <Pressable
              key={tag}
              disabled={disabled}
              onPress={() => onChangeSelected(toggleCaptureTag(selectedTags, tag))}
              onLongPress={deletable ? () => openDelete(tag) : undefined}
              delayLongPress={450}
              style={[styles.chip, isOn(tag) && styles.chipOn]}>
              <Text style={[styles.chipText, isOn(tag) && styles.chipTextOn]}>{tag}</Text>
            </Pressable>
          );
        })}
        <Pressable
          disabled={disabled}
          onPress={() => setAddVisible(true)}
          style={[styles.chip, styles.addChip]}
          accessibilityLabel={t('capture.addTag')}>
          <Text style={styles.addChipText}>+</Text>
        </Pressable>
      </ScrollView>

      <SendToNewFolderModal
        visible={addVisible}
        title={t('capture.addTagTitle')}
        hint={t('capture.addTagHint')}
        name={draftLabel}
        placeholder={t('capture.addTagPlaceholder')}
        sendLabel={t('common.add')}
        cancelLabel={t('common.cancel')}
        onChangeName={setDraftLabel}
        onSend={confirmAdd}
        onClose={closeAdd}
      />

      <CaptureTagDeleteModal
        visible={deleteTag !== null}
        tag={deleteTag ?? ''}
        title={t('capture.deleteTagTitle')}
        hint={t('capture.deleteTagHint')}
        deleteLabel={t('capture.deleteTagConfirm')}
        cancelLabel={t('common.cancel')}
        onDelete={confirmDelete}
        onClose={closeDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4 },
  label: { fontSize: theme.font.caption, fontWeight: '700', color: theme.gray, marginTop: 8 },
  chips: { marginVertical: 12 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.grayLight,
    marginRight: 8,
    backgroundColor: theme.surface,
  },
  chipOn: { backgroundColor: theme.orange, borderColor: theme.orange },
  chipText: { fontWeight: '700', color: theme.black },
  chipTextOn: { color: theme.white },
  addChip: {
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  addChipText: { fontSize: 22, fontWeight: '800', color: theme.orange, lineHeight: 26 },
});

const modalStyles = StyleSheet.create({
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
  tagPill: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.grayLight,
  },
  tagPillText: { fontWeight: '800', color: theme.black, fontSize: theme.font.body },
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
  btnDelete: {
    backgroundColor: '#DC2626',
  },
  btnCancelText: {
    fontWeight: '700',
    color: theme.black,
  },
  btnDeleteText: {
    fontWeight: '800',
    color: theme.white,
  },
});
