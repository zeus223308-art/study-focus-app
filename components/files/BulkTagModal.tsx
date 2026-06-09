import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CaptureTagPicker } from '@/components/capture/CaptureTagPicker';
import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import { webFixedBackdropStyle } from '@/lib/ui/web-fixed-overlay';
import type { Language } from '@/lib/domain/types';

type Props = {
  visible: boolean;
  photoCount: number;
  language: Language;
  presets: string[];
  tagColors?: Record<string, string>;
  tagColorFallback?: string;
  isPro?: boolean;
  onRequirePremium?: () => void;
  onAddPreset: (label: string) => void;
  onRemovePreset: (label: string) => void;
  onSetTagColor?: (tag: string, color: string) => void;
  onApply: (tags: string[]) => void;
  onClose: () => void;
};

export function BulkTagModal({
  visible,
  photoCount,
  language,
  presets,
  tagColors,
  tagColorFallback,
  isPro,
  onRequirePremium,
  onAddPreset,
  onRemovePreset,
  onSetTagColor,
  onApply,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    if (visible) setSelectedTags([]);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('common.close')} />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(20, insets.bottom + 12), maxHeight: '88%' },
          ]}>
          <Text style={styles.title}>{t('folder.bulkTagTitle')}</Text>
          <Text style={styles.hint}>{t('folder.bulkTagHint', { count: photoCount })}</Text>
          <CaptureTagPicker
            presets={presets}
            selectedTags={selectedTags}
            language={language}
            onChangeSelected={setSelectedTags}
            onAddPreset={onAddPreset}
            onRemovePreset={onRemovePreset}
            tagColors={tagColors}
            tagColorFallback={tagColorFallback}
            onSetTagColor={onSetTagColor}
            isPro={isPro}
            onRequirePremium={onRequirePremium}
          />
          <View style={styles.actions}>
            <Button
              label={t('folder.bulkTagApply', { count: photoCount })}
              onPress={() => onApply(selectedTags)}
              disabled={selectedTags.length === 0}
            />
            <Button label={t('common.cancel')} variant="ghost" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
    ...webFixedBackdropStyle,
  },
  sheet: {
    backgroundColor: theme.beige,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  title: {
    fontSize: theme.font.heading,
    fontWeight: '800',
    color: theme.black,
    textAlign: 'center',
  },
  hint: {
    fontSize: theme.font.caption,
    color: theme.gray,
    textAlign: 'center',
    lineHeight: 18,
  },
  actions: { gap: 8, marginTop: 4 },
});
