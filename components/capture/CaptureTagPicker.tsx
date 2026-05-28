import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SendToNewFolderModal } from '@/components/files/SendToNewFolderModal';
import { theme } from '@/constants/theme';
import { toggleCaptureTag } from '@/lib/domain/capture-tags';

type Props = {
  presets: string[];
  selectedTags: string[];
  onChangeSelected: (tags: string[]) => void;
  onAddPreset: (label: string) => void;
  disabled?: boolean;
};

export function CaptureTagPicker({
  presets,
  selectedTags,
  onChangeSelected,
  onAddPreset,
  disabled,
}: Props) {
  const { t } = useTranslation();
  const [addVisible, setAddVisible] = useState(false);
  const [draftLabel, setDraftLabel] = useState('');

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

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{t('capture.pickTags')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        {presets.map((tag) => (
          <Pressable
            key={tag}
            disabled={disabled}
            onPress={() => onChangeSelected(toggleCaptureTag(selectedTags, tag))}
            style={[styles.chip, isOn(tag) && styles.chipOn]}>
            <Text style={[styles.chipText, isOn(tag) && styles.chipTextOn]}>{tag}</Text>
          </Pressable>
        ))}
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
