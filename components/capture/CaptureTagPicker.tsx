import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SendToNewFolderModal } from '@/components/files/SendToNewFolderModal';
import { TagColorModal } from '@/components/tags/TagColorModal';
import { theme } from '@/constants/theme';
import {
  canDeleteCaptureTagPreset,
  normalizeCaptureTagLabel,
  toggleCaptureTag,
} from '@/lib/domain/capture-tags';
import type { Language } from '@/lib/domain/types';
import { BUTTON_LABEL_DEFAULT, BUTTON_LABEL_EMPHASIS } from '@/lib/ui/button-label';
import { resolveTagColorFor } from '@/lib/ui/tag-colors';

type Props = {
  presets: string[];
  selectedTags: string[];
  language: Language;
  onChangeSelected: (tags: string[]) => void;
  onAddPreset: (label: string) => void;
  onRemovePreset: (label: string) => void;
  /** Per-tag colors keyed by normalized label. */
  tagColors?: Record<string, string>;
  /** Fallback color for tags without an explicit color. */
  tagColorFallback?: string;
  /** Sets the color for a single tag. Enables the per-tag color control. */
  onSetTagColor?: (tag: string, color: string) => void;
  /** Pro unlocks the custom color input. */
  isPro?: boolean;
  onRequirePremium?: () => void;
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
  tagColors,
  tagColorFallback,
  onSetTagColor,
  isPro,
  onRequirePremium,
  disabled,
}: Props) {
  const { t } = useTranslation();
  const [addVisible, setAddVisible] = useState(false);
  const [draftLabel, setDraftLabel] = useState('');
  const [deleteTag, setDeleteTag] = useState<string | null>(null);
  const [colorTag, setColorTag] = useState<string | null>(null);
  const colorEnabled = Boolean(onSetTagColor);
  const colorForTag = (tag: string) => resolveTagColorFor(tag, tagColors, tagColorFallback);

  const displayTags = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    const push = (tag: string) => {
      const n = normalizeCaptureTagLabel(tag);
      if (!n) return;
      const key = n.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(n);
    };
    for (const p of presets) push(p);
    for (const s of selectedTags) push(s);
    return out;
  }, [presets, selectedTags]);

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

  const pickColor = (color: string) => {
    if (colorTag) onSetTagColor?.(colorTag, color);
    setColorTag(null);
  };

  const openDelete = (tag: string) => {
    if (disabled || !canDeleteCaptureTagPreset(tag, language)) return;
    setDeleteTag(tag);
  };

  const removePresetNow = (tag: string) => {
    if (disabled || !canDeleteCaptureTagPreset(tag, language)) return;
    onRemovePreset(tag);
    const key = normalizeCaptureTagLabel(tag).toLowerCase();
    onChangeSelected(selectedTags.filter((s) => s.toLowerCase() !== key));
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
      <View style={styles.header}>
        <Text style={styles.label}>{t('capture.pickTags')}</Text>
        {selectedTags.length > 0 ? (
          <Pressable
            disabled={disabled}
            onPress={() => onChangeSelected([])}
            hitSlop={8}
            accessibilityRole="button">
            <Text style={styles.clearAll}>{t('capture.clearAllTags')}</Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        {displayTags.map((tag) => {
          const deletable = canDeleteCaptureTagPreset(tag, language);
          const on = isOn(tag);
          return (
            <View key={tag} style={[styles.chip, on && styles.chipOn]}>
              {colorEnabled ? (
                <Pressable
                  disabled={disabled}
                  onPress={() => setColorTag(tag)}
                  hitSlop={6}
                  style={styles.chipColorDot}
                  accessibilityRole="button"
                  accessibilityLabel={t('capture.pickTagColor')}>
                  <View
                    style={[styles.chipColorDotInner, { backgroundColor: colorForTag(tag) }]}
                  />
                </Pressable>
              ) : null}
              <Pressable
                disabled={disabled}
                onPress={() => onChangeSelected(toggleCaptureTag(selectedTags, tag))}
                onLongPress={deletable ? () => openDelete(tag) : undefined}
                delayLongPress={450}
                style={styles.chipLabelHit}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{tag}</Text>
              </Pressable>
              {deletable ? (
                <Pressable
                  disabled={disabled}
                  onPress={() => removePresetNow(tag)}
                  hitSlop={8}
                  style={styles.chipDelete}
                  accessibilityRole="button"
                  accessibilityLabel={t('capture.deleteTagConfirm')}>
                  <Text style={[styles.chipDeleteText, on && styles.chipTextOn]}>×</Text>
                </Pressable>
              ) : null}
            </View>
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

      <TagColorModal
        visible={colorTag !== null}
        tag={colorTag ?? ''}
        current={colorForTag(colorTag ?? '')}
        isPro={Boolean(isPro)}
        title={t('capture.pickTagColor')}
        freeLabel={t('capture.tagColorsFree')}
        customLabel={t('capture.tagColorCustom')}
        customHint={t('capture.tagColorCustomLocked')}
        applyLabel={t('common.apply')}
        cancelLabel={t('common.cancel')}
        onPick={pickColor}
        onRequirePremium={() => {
          setColorTag(null);
          onRequirePremium?.();
        }}
        onClose={() => setColorTag(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  label: { fontSize: theme.font.caption, fontWeight: '700', color: theme.gray },
  clearAll: {
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.orange,
  },
  chips: { marginVertical: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 6,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.grayLight,
    marginRight: 8,
    backgroundColor: theme.surface,
  },
  chipOn: { backgroundColor: theme.orange, borderColor: theme.orange },
  chipColorDot: {
    paddingVertical: 12,
    paddingRight: 6,
    justifyContent: 'center',
  },
  chipColorDotInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  chipLabelHit: { paddingVertical: 12, paddingRight: 4 },
  chipText: { fontWeight: '700', color: theme.black },
  chipTextOn: { color: theme.onAccent },
  chipDelete: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  chipDeleteText: { fontSize: 16, fontWeight: '800', color: theme.gray, lineHeight: 18 },
  addChip: {
    minWidth: 48,
    paddingLeft: 0,
    paddingRight: 0,
    paddingVertical: 12,
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
    ...BUTTON_LABEL_DEFAULT,
    color: theme.black,
  },
  btnDeleteText: {
    ...BUTTON_LABEL_EMPHASIS,
    color: theme.white,
  },
});
