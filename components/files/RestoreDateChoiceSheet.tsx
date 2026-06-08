import { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { StudyDateStepper } from '@/components/ui/StudyDateStepper';
import { theme } from '@/constants/theme';
import { parseStudyDateInput } from '@/lib/domain/dates';

type Props = {
  visible: boolean;
  firstLaunchDate: string;
  localToday: string;
  /** Default date for the custom picker (e.g. original study date). */
  defaultStudyDate: string;
  onClose: () => void;
  onRestoreToday: () => void;
  onRestoreKeepDate: () => void;
  onRestoreCustom: (studyDate: string) => void;
};

/** Ask whether archived photos should restore with today's date, keep original, or a custom date. */
export function RestoreDateChoiceSheet({
  visible,
  firstLaunchDate,
  localToday,
  defaultStudyDate,
  onClose,
  onRestoreToday,
  onRestoreKeepDate,
  onRestoreCustom,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'choices' | 'custom'>('choices');
  const [customDate, setCustomDate] = useState(defaultStudyDate);
  const [draftInput, setDraftInput] = useState(defaultStudyDate);
  const [inputError, setInputError] = useState(false);

  const initialCustomDate = useMemo(
    () => parseStudyDateInput(defaultStudyDate, firstLaunchDate, localToday) ?? localToday,
    [defaultStudyDate, firstLaunchDate, localToday]
  );

  useEffect(() => {
    if (!visible) return;
    setStep('choices');
    setCustomDate(initialCustomDate);
    setDraftInput(initialCustomDate);
    setInputError(false);
  }, [visible, initialCustomDate]);

  const handleCustomDateChange = (next: string) => {
    setCustomDate(next);
    setDraftInput(next);
    setInputError(false);
  };

  const handleInputChange = (text: string) => {
    setDraftInput(text);
    setInputError(false);
    const parsed = parseStudyDateInput(text, firstLaunchDate, localToday);
    if (parsed) setCustomDate(parsed);
  };

  const confirmCustom = () => {
    const parsed = parseStudyDateInput(draftInput, firstLaunchDate, localToday);
    if (!parsed) {
      setInputError(true);
      return;
    }
    onRestoreCustom(parsed);
  };

  const closeSheet = () => {
    setStep('choices');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={closeSheet}>
      <Pressable style={styles.backdrop} onPress={closeSheet}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(24, insets.bottom + 12) }]}
          onPress={() => {}}>
          <View style={styles.handle} />
          {step === 'choices' ? (
            <>
              <Text style={styles.title}>{t('folder.restoreDateTitle')}</Text>
              <Text style={styles.message}>{t('folder.restoreDateMessage')}</Text>
              <Button
                label={t('folder.restoreDateToday')}
                variant="secondary"
                onPress={onRestoreToday}
              />
              <Button
                label={t('folder.restoreDateKeep')}
                variant="secondary"
                onPress={onRestoreKeepDate}
                style={styles.choiceBtn}
              />
              <Button
                label={t('folder.restoreDateCustom')}
                variant="secondary"
                onPress={() => setStep('custom')}
                style={styles.choiceBtn}
              />
              <Pressable onPress={closeSheet} style={styles.cancelRow} accessibilityRole="button">
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.title}>{t('folder.restoreDateCustomTitle')}</Text>
              <Text style={styles.message}>{t('folder.restoreDateCustomHint')}</Text>
              <StudyDateStepper
                studyDate={customDate}
                onChange={handleCustomDateChange}
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
                onSubmitEditing={confirmCustom}
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
              <Button
                label={t('folder.restoreDateCustomConfirm')}
                variant="secondary"
                onPress={confirmCustom}
                style={styles.choiceBtn}
              />
              <Pressable
                onPress={() => setStep('choices')}
                style={styles.cancelRow}
                accessibilityRole="button">
                <Text style={styles.cancelText}>{t('common.back')}</Text>
              </Pressable>
            </>
          )}
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
    ...Platform.select({
      web: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0 },
      default: {},
    }),
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
  choiceBtn: { marginTop: 8 },
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
