import { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { StudyDateStepper } from '@/components/ui/StudyDateStepper';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { parseStudyDateInput } from '@/lib/domain/dates';
import { webFixedBackdropStyle } from '@/lib/ui/web-fixed-overlay';

type Props = {
  visible: boolean;
  studyDate: string;
  firstLaunchDate: string;
  onClose: () => void;
  onConfirm: (studyDate: string) => void;
};

/** Bottom sheet to pick a study date (stepper + typed yyyy-MM-dd). */
export function StudyDatePickSheet({
  visible,
  studyDate,
  firstLaunchDate,
  onClose,
  onConfirm,
}: Props) {
  const { t } = useTranslation();
  const { localToday } = useApp();
  const insets = useSafeAreaInsets();
  const [draftDate, setDraftDate] = useState(studyDate);
  const [draftInput, setDraftInput] = useState(studyDate);
  const [inputError, setInputError] = useState(false);

  const initialDate = useMemo(
    () => parseStudyDateInput(studyDate, firstLaunchDate, localToday) ?? localToday,
    [studyDate, firstLaunchDate, localToday]
  );

  useEffect(() => {
    if (!visible) return;
    setDraftDate(initialDate);
    setDraftInput(initialDate);
    setInputError(false);
  }, [visible, initialDate]);

  const handleStepperChange = (next: string) => {
    setDraftDate(next);
    setDraftInput(next);
    setInputError(false);
  };

  const handleInputChange = (text: string) => {
    setDraftInput(text);
    setInputError(false);
    const parsed = parseStudyDateInput(text, firstLaunchDate, localToday);
    if (parsed) setDraftDate(parsed);
  };

  const confirm = () => {
    const parsed = parseStudyDateInput(draftInput, firstLaunchDate, localToday);
    if (!parsed) {
      setInputError(true);
      return;
    }
    onConfirm(parsed);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(24, insets.bottom + 12) }]}
          onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>{t('capture.pickDateTitle')}</Text>
          <Text style={styles.message}>{t('capture.pickDateHint')}</Text>
          <StudyDateStepper
            studyDate={draftDate}
            onChange={handleStepperChange}
            firstLaunchDate={firstLaunchDate}
            style={styles.stepper}
          />
          <TextInput
            value={draftInput}
            onChangeText={handleInputChange}
            placeholder={t('folder.restoreDateCustomPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
            returnKeyType="done"
            onSubmitEditing={confirm}
            style={[styles.input, inputError && styles.inputError]}
            accessibilityLabel={t('folder.restoreDateCustomPlaceholder')}
            {...(Platform.OS === 'web'
              ? ({
                  inputMode: 'numeric',
                  pattern: '\\d{4}-\\d{2}-\\d{2}',
                  maxLength: 10,
                  outlineStyle: 'none',
                } as object)
              : { maxLength: 10 })}
          />
          {inputError ? (
            <Text style={styles.errorText}>{t('folder.restoreDateInvalid')}</Text>
          ) : null}
          <Button label={t('common.apply')} onPress={confirm} style={styles.applyBtn} />
          <Pressable onPress={onClose} style={styles.cancelRow} accessibilityRole="button">
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
    maxWidth: 360,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.grayLight,
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: theme.font.heading,
    fontWeight: '800',
    color: theme.black,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: theme.font.bodySmall,
    color: theme.gray,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  stepper: {
    marginTop: 0,
    marginBottom: 12,
    width: '100%',
  },
  input: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.grayLight,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: theme.font.body,
    fontWeight: '700',
    color: theme.black,
    textAlign: 'center',
    marginBottom: 8,
  },
  inputError: {
    borderColor: theme.danger,
  },
  errorText: {
    fontSize: theme.font.caption,
    color: theme.danger,
    textAlign: 'center',
    marginBottom: 8,
  },
  applyBtn: { marginTop: 4 },
  cancelRow: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.grayMuted,
  },
});
