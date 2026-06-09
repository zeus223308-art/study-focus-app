import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { theme } from '@/constants/theme';

export const REVIEW_PATTERN_CHANGE_COOLDOWN_SEC = 3;

type Props = {
  visible: boolean;
  subjectName: string;
  fromLabel: string;
  toLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ReviewPatternChangeModal({
  visible,
  subjectName,
  fromLabel,
  toLabel,
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useTranslation();
  const [secondsLeft, setSecondsLeft] = useState(REVIEW_PATTERN_CHANGE_COOLDOWN_SEC);

  useEffect(() => {
    if (!visible) {
      setSecondsLeft(REVIEW_PATTERN_CHANGE_COOLDOWN_SEC);
      return;
    }
    setSecondsLeft(REVIEW_PATTERN_CHANGE_COOLDOWN_SEC);
    const id = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [visible, subjectName, fromLabel, toLabel]);

  const canSave = secondsLeft <= 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
      presentationStyle="overFullScreen">
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{t('settings.reviewPatternChangeTitle')}</Text>
          <Text style={styles.subject}>{subjectName}</Text>
          <Text style={styles.changeLine}>
            {fromLabel} → {toLabel}
          </Text>
          <Text style={styles.note}>{t('settings.reviewPatternChangeNote')}</Text>
          <Text style={[styles.wait, canSave && styles.waitReady]}>
            {canSave
              ? t('settings.reviewPatternChangeReady')
              : t('settings.reviewPatternChangeWait', { seconds: secondsLeft })}
          </Text>
          <View style={styles.actions}>
            <Pressable style={[styles.btn, styles.btnCancel]} onPress={onCancel}>
              <Text style={styles.btnCancelText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnConfirm, !canSave && styles.btnDisabled]}
              onPress={canSave ? onConfirm : undefined}
              disabled={!canSave}>
              <Text style={[styles.btnConfirmText, !canSave && styles.btnConfirmTextDisabled]}>
                {t('common.save')}
              </Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    zIndex: 99999,
    ...Platform.select({
      web: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0 },
      default: {},
    }),
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: theme.beige,
    borderRadius: theme.radius.lg,
    padding: 22,
    gap: 10,
  },
  title: {
    fontSize: theme.font.body,
    fontWeight: '800',
    color: theme.black,
  },
  subject: {
    fontSize: theme.font.body,
    fontWeight: '700',
    color: theme.orange,
  },
  changeLine: {
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.black,
  },
  note: {
    fontSize: theme.font.caption,
    lineHeight: 18,
    color: theme.gray,
    marginTop: 4,
  },
  wait: {
    fontSize: theme.font.caption,
    fontWeight: '800',
    color: theme.orange,
    marginTop: 6,
    textAlign: 'center',
  },
  waitReady: {
    color: theme.black,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  btnCancel: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.grayLight,
  },
  btnCancelText: {
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.black,
  },
  btnConfirm: {
    backgroundColor: theme.orange,
  },
  btnDisabled: {
    backgroundColor: theme.grayLight,
  },
  btnConfirmText: {
    fontSize: theme.font.caption,
    fontWeight: '800',
    color: theme.onAccent,
  },
  btnConfirmTextDisabled: {
    color: theme.gray,
  },
});
