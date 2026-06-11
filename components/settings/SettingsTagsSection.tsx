import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingsGroup } from '@/components/SettingsGroup';
import { SettingsSectionHeader } from '@/components/settings/SettingsSectionHeader';
import { TagColorModal } from '@/components/tags/TagColorModal';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import {
  captureTagExists,
  captureTagKey,
  collectAllCaptureTags,
  normalizeCaptureTagLabel,
} from '@/lib/domain/capture-tags';
import { BUTTON_LABEL_DEFAULT, BUTTON_LABEL_EMPHASIS } from '@/lib/ui/button-label';
import { resolveTagColorFor } from '@/lib/ui/tag-colors';
import { showMessage } from '@/lib/ui/confirm';
import { webHairlineBottom, webHairlineTop } from '@/lib/ui/web-divider';
import { settingsRowBoxWeb } from '@/lib/ui/settings-row-web';
import { stopSheetPress, webFixedBackdropStyle } from '@/lib/ui/web-fixed-overlay';

type EditMode = { kind: 'edit'; original: string } | { kind: 'add' };

export function SettingsTagsSection() {
  const { t } = useTranslation();
  const {
    data,
    setPaywallVisible,
    setTagColorFor,
    renameCaptureTag,
    addCaptureTagPreset,
    removeCaptureTag,
  } = useApp();
  const insets = useSafeAreaInsets();

  const [editMode, setEditMode] = useState<EditMode | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftColor, setDraftColor] = useState(theme.orange);
  const [colorOpen, setColorOpen] = useState(false);

  const isPro = data.settings.tier === 'pro';
  const tagColorFallback = data.settings.tagColor;

  const tags = useMemo(
    () => collectAllCaptureTags(data.settings.captureTagPresets, data.bundles),
    [data.settings.captureTagPresets, data.bundles]
  );

  const colorForTag = (tag: string) =>
    resolveTagColorFor(tag, data.settings.tagColors, tagColorFallback);

  const openEdit = (tag: string) => {
    setEditMode({ kind: 'edit', original: tag });
    setDraftName(tag);
    setDraftColor(colorForTag(tag));
    setColorOpen(false);
  };

  const openAdd = () => {
    setEditMode({ kind: 'add' });
    setDraftName('');
    setDraftColor(resolveTagColorFor('', data.settings.tagColors, tagColorFallback));
    setColorOpen(false);
  };

  const closeEdit = () => {
    setEditMode(null);
    setColorOpen(false);
  };

  const saveEdit = () => {
    const normalized = normalizeCaptureTagLabel(draftName);
    if (!normalized) return;

    if (editMode?.kind === 'add') {
      if (captureTagExists(normalized, data.settings.captureTagPresets, data.bundles)) {
        showMessage(t('settings.tagsDuplicate'));
        return;
      }
      addCaptureTagPreset(normalized);
      setTagColorFor(normalized, draftColor);
      closeEdit();
      return;
    }

    if (editMode?.kind === 'edit') {
      const fromKey = captureTagKey(editMode.original);
      const toKey = captureTagKey(normalized);
      if (
        fromKey !== toKey &&
        captureTagExists(normalized, data.settings.captureTagPresets, data.bundles, fromKey)
      ) {
        showMessage(t('settings.tagsDuplicate'));
        return;
      }
      if (fromKey !== toKey) {
        renameCaptureTag(editMode.original, normalized);
      }
      setTagColorFor(normalized, draftColor);
      closeEdit();
    }
  };

  const confirmDelete = () => {
    if (editMode?.kind !== 'edit') return;
    removeCaptureTag(editMode.original);
    closeEdit();
  };

  const editTitle =
    editMode?.kind === 'add' ? t('settings.tagsAddTitle') : t('settings.tagsEditTitle');
  const canSave = draftName.trim().length > 0;

  return (
    <>
      <SettingsSectionHeader title={t('settings.tagsSection')} />
      <SettingsGroup>
        {tags.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>{t('settings.tagsEmpty')}</Text>
          </View>
        ) : (
          tags.map((tag, i) => (
            <Pressable
              key={tag}
              onPress={() => openEdit(tag)}
              style={[styles.row, settingsRowBoxWeb(), i < tags.length - 1 && styles.rowBorder]}>
              <View style={styles.rowLeft}>
                <View style={[styles.dot, { backgroundColor: colorForTag(tag) }]} />
                <Text style={styles.label} numberOfLines={1}>
                  {tag}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))
        )}
        <Pressable
          onPress={openAdd}
          style={[styles.row, settingsRowBoxWeb(), tags.length > 0 && styles.rowBorderTop, styles.addRow]}>
          <Text style={styles.addLabel}>{t('settings.tagsAdd')}</Text>
        </Pressable>
      </SettingsGroup>

      <Modal
        visible={editMode !== null}
        transparent
        animationType="fade"
        onRequestClose={closeEdit}>
        <Pressable style={styles.backdrop} onPress={closeEdit}>
          <Pressable
            style={[styles.card, { marginBottom: Math.max(24, insets.bottom) }]}
            onPress={stopSheetPress}>
            <Text style={styles.modalTitle}>{editTitle}</Text>

            <Text style={styles.fieldLabel}>{t('settings.tagsName')}</Text>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              placeholder={t('capture.addTagPlaceholder')}
              placeholderTextColor={theme.grayMuted}
              maxLength={40}
              autoFocus={editMode?.kind === 'add'}
              style={styles.input}
              {...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {})}
            />

            <Text style={styles.fieldLabel}>{t('settings.tagsColor')}</Text>
            <Pressable
              onPress={() => setColorOpen(true)}
              style={styles.colorRow}
              accessibilityRole="button"
              accessibilityLabel={t('capture.pickTagColor')}>
              <View style={[styles.colorSwatch, { backgroundColor: draftColor }]} />
              <Text style={styles.colorRowText}>{t('capture.pickTagColor')}</Text>
            </Pressable>

            <View style={styles.actions}>
              <Pressable style={[styles.btn, styles.btnCancel]} onPress={closeEdit}>
                <Text style={styles.btnCancelText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                disabled={!canSave}
                onPress={canSave ? saveEdit : undefined}
                style={[styles.btn, styles.btnSave, !canSave && styles.btnSaveOff]}>
                <Text style={[styles.btnSaveText, !canSave && styles.btnSaveTextOff]}>
                  {t('common.save')}
                </Text>
              </Pressable>
            </View>

            {editMode?.kind === 'edit' ? (
              <Pressable onPress={confirmDelete} style={styles.deleteBtn}>
                <Text style={styles.deleteBtnText}>{t('settings.tagsDelete')}</Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <TagColorModal
        visible={colorOpen}
        tag={draftName.trim() || ' '}
        current={draftColor}
        isPro={isPro}
        title={t('capture.pickTagColor')}
        freeLabel={t('capture.tagColorsFree')}
        customLabel={t('capture.tagColorCustom')}
        customHint={t('capture.tagColorCustomLocked')}
        applyLabel={t('common.apply')}
        cancelLabel={t('common.cancel')}
        onPick={(color) => {
          setDraftColor(color);
          setColorOpen(false);
        }}
        onRequirePremium={() => {
          setColorOpen(false);
          setPaywallVisible(true);
        }}
        onClose={() => setColorOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 46,
  },
  rowBorder: webHairlineBottom,
  rowBorderTop: webHairlineTop,
  rowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  label: {
    flex: 1,
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.black,
  },
  chevron: {
    fontSize: 22,
    fontWeight: '300',
    color: theme.grayMuted,
    marginLeft: 8,
  },
  emptyRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: theme.font.bodySmall,
    color: theme.graySecondary,
  },
  addRow: {
    justifyContent: 'center',
  },
  addLabel: {
    fontSize: theme.font.body,
    fontWeight: '700',
    color: theme.orange,
    textAlign: 'center',
    width: '100%',
  },
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
    gap: 8,
  },
  modalTitle: {
    fontSize: theme.font.heading,
    fontWeight: '800',
    color: theme.black,
    textAlign: 'center',
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.graySecondary,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.grayLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.black,
    backgroundColor: theme.surface,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.grayLight,
    borderRadius: 10,
    backgroundColor: theme.surface,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  colorRowText: {
    fontSize: theme.font.body,
    fontWeight: '600',
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
  btnSave: {
    backgroundColor: theme.orange,
  },
  btnSaveOff: {
    backgroundColor: theme.grayLight,
  },
  btnCancelText: {
    ...BUTTON_LABEL_DEFAULT,
    color: theme.black,
  },
  btnSaveText: {
    ...BUTTON_LABEL_EMPHASIS,
    color: theme.onAccent,
  },
  btnSaveTextOff: {
    color: theme.graySecondary,
  },
  deleteBtn: {
    marginTop: 4,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: theme.font.bodySmall,
    fontWeight: '700',
    color: theme.graySecondary,
  },
});
