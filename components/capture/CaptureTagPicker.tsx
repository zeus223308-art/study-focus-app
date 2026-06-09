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
import { resolveTagColorFor, tagLabelTextColor } from '@/lib/ui/tag-colors';
import { showMessage } from '@/lib/ui/confirm';
import { webFixedBackdropStyle } from '@/lib/ui/web-fixed-overlay';
import { webHairlineTop } from '@/lib/ui/web-divider';

type Props = {
  presets: string[];
  selectedTags: string[];
  language: Language;
  onChangeSelected: (tags: string[]) => void;
  onAddPreset: (label: string) => void;
  onRemovePreset: (label: string) => void;
  onRenamePreset?: (fromLabel: string, toLabel: string) => void;
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
  tagColor,
  title,
  hint,
  deleteLabel,
  cancelLabel,
  onDelete,
  onClose,
}: {
  visible: boolean;
  tag: string;
  tagColor: string;
  title: string;
  hint: string;
  deleteLabel: string;
  cancelLabel: string;
  onDelete: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const labelColor = tagLabelTextColor(tagColor);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={modalStyles.backdrop} onPress={onClose}>
        <Pressable
          style={[modalStyles.card, { marginBottom: Math.max(24, insets.bottom) }]}
          onPress={() => {}}>
          <Text style={modalStyles.title}>{title}</Text>
          <Text style={modalStyles.hint}>{hint}</Text>
          <View style={[modalStyles.tagPill, { backgroundColor: tagColor }]}>
            <Text style={[modalStyles.tagPillText, { color: labelColor }]}>{tag}</Text>
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

function TagChipActionSheet({
  visible,
  tag,
  renameLabel,
  colorLabel,
  deleteLabel,
  cancelLabel,
  showDelete,
  showColor,
  showRename,
  onRename,
  onColor,
  onDelete,
  onClose,
}: {
  visible: boolean;
  tag: string;
  renameLabel: string;
  colorLabel: string;
  deleteLabel: string;
  cancelLabel: string;
  showDelete: boolean;
  showColor: boolean;
  showRename: boolean;
  onRename: () => void;
  onColor: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sheetStyles.backdrop} onPress={onClose}>
        <Pressable
          style={[sheetStyles.sheet, { paddingBottom: Math.max(28, insets.bottom + 12) }]}
          onPress={() => {}}>
          <View style={sheetStyles.handle} />
          <Text style={sheetStyles.tagTitle} numberOfLines={1}>
            {tag}
          </Text>
          {showRename ? (
            <Pressable style={sheetStyles.row} onPress={onRename}>
              <Text style={sheetStyles.rowText}>{renameLabel}</Text>
            </Pressable>
          ) : null}
          {showColor ? (
            <Pressable
              style={[sheetStyles.row, showRename && sheetStyles.rowBorder]}
              onPress={onColor}>
              <Text style={sheetStyles.rowText}>{colorLabel}</Text>
            </Pressable>
          ) : null}
          {showDelete ? (
            <Pressable
              style={[
                sheetStyles.row,
                (showRename || showColor) && sheetStyles.rowBorder,
              ]}
              onPress={onDelete}>
              <Text style={[sheetStyles.rowText, sheetStyles.deleteText]}>{deleteLabel}</Text>
            </Pressable>
          ) : null}
          <Pressable style={sheetStyles.cancelRow} onPress={onClose}>
            <Text style={sheetStyles.cancelText}>{cancelLabel}</Text>
          </Pressable>
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
  onRenamePreset,
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
  const [actionTag, setActionTag] = useState<string | null>(null);
  const [renameTag, setRenameTag] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
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

  const closeAction = () => setActionTag(null);

  const openRename = () => {
    if (!actionTag) return;
    setRenameTag(actionTag);
    setRenameDraft(actionTag);
    closeAction();
  };

  const closeRename = () => {
    setRenameTag(null);
    setRenameDraft('');
  };

  const confirmRename = () => {
    if (!renameTag) return;
    const normalized = normalizeCaptureTagLabel(renameDraft);
    if (!normalized) return;
    const fromKey = renameTag.toLowerCase();
    const toKey = normalized.toLowerCase();
    if (
      fromKey !== toKey &&
      displayTags.some((t) => t.toLowerCase() === toKey && t.toLowerCase() !== fromKey)
    ) {
      showMessage(t('settings.tagsDuplicate'));
      return;
    }
    if (fromKey !== toKey) {
      if (!onRenamePreset) return;
      onRenamePreset(renameTag, normalized);
      onChangeSelected(
        selectedTags.map((s) => (s.toLowerCase() === fromKey ? normalized : s))
      );
    }
    closeRename();
  };

  const openColorFromAction = () => {
    if (!actionTag || !colorEnabled) return;
    setColorTag(actionTag);
    closeAction();
  };

  const openDeleteFromAction = () => {
    if (!actionTag || !canDeleteCaptureTagPreset(actionTag, language)) return;
    setDeleteTag(actionTag);
    closeAction();
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

  const openActions = (tag: string) => {
    if (disabled) return;
    setActionTag(tag);
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
          const on = isOn(tag);
          const bg = colorForTag(tag);
          const textColor = tagLabelTextColor(bg);
          return (
            <Pressable
              key={tag}
              disabled={disabled}
              onPress={() => onChangeSelected(toggleCaptureTag(selectedTags, tag))}
              onLongPress={() => openActions(tag)}
              delayLongPress={450}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[
                styles.chip,
                { backgroundColor: bg },
                on ? styles.chipOn : styles.chipOff,
              ]}>
              <Text style={[styles.chipText, { color: textColor }]} numberOfLines={1}>
                {tag}
              </Text>
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

      <SendToNewFolderModal
        visible={renameTag !== null}
        title={t('capture.renameTagTitle')}
        hint={t('capture.renameTagHint')}
        name={renameDraft}
        placeholder={t('capture.addTagPlaceholder')}
        sendLabel={t('common.save')}
        cancelLabel={t('common.cancel')}
        onChangeName={setRenameDraft}
        onSend={confirmRename}
        onClose={closeRename}
      />

      <TagChipActionSheet
        visible={actionTag !== null}
        tag={actionTag ?? ''}
        renameLabel={t('capture.tagActionRename')}
        colorLabel={t('capture.tagActionColor')}
        deleteLabel={t('capture.deleteTagConfirm')}
        cancelLabel={t('common.cancel')}
        showDelete={actionTag ? canDeleteCaptureTagPreset(actionTag, language) : false}
        showColor={colorEnabled}
        showRename={Boolean(onRenamePreset)}
        onRename={openRename}
        onColor={openColorFromAction}
        onDelete={openDeleteFromAction}
        onClose={closeAction}
      />

      <CaptureTagDeleteModal
        visible={deleteTag !== null}
        tag={deleteTag ?? ''}
        tagColor={deleteTag ? colorForTag(deleteTag) : theme.surface}
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
  chips: { marginVertical: 8 },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    marginRight: 6,
    minHeight: 26,
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipOn: {
    borderColor: 'rgba(255,255,255,0.85)',
  },
  chipOff: {
    opacity: 0.52,
  },
  chipText: {
    fontSize: theme.font.label,
    fontWeight: '700',
    lineHeight: 14,
  },
  addChip: {
    minWidth: 34,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderColor: theme.grayLight,
    borderStyle: 'dashed',
    opacity: 1,
  },
  addChipText: { fontSize: 18, fontWeight: '800', color: theme.orange, lineHeight: 20 },
});

const sheetStyles = StyleSheet.create({
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
    marginBottom: 10,
  },
  tagTitle: {
    fontSize: theme.font.caption,
    fontWeight: '800',
    color: theme.grayMuted,
    textAlign: 'center',
    marginBottom: 8,
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
    color: theme.danger,
  },
  cancelRow: {
    marginTop: 6,
    paddingVertical: 10,
    alignItems: 'center',
    ...webHairlineTop,
  },
  cancelText: {
    ...BUTTON_LABEL_DEFAULT,
    color: theme.gray,
  },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    ...webFixedBackdropStyle,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
  },
  tagPillText: { fontWeight: '800', fontSize: theme.font.caption },
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
