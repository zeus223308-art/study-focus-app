import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, parseISO } from 'date-fns';

import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { buildRibbonDays, todayKey } from '@/lib/domain/dates';
import { IMAGE_CAPTURE_QUALITY } from '@/lib/files/image-quality';
import { showMessage } from '@/lib/ui/confirm';

type Step = 'camera' | 'answer-prompt' | 'save-sheet';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function CaptureTabScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, captureFlashcardPair } = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [step, setStep] = useState<Step>('camera');
  const [shootingBack, setShootingBack] = useState(false);
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [backUri, setBackUri] = useState<string | null>(null);
  const [studyDate, setStudyDate] = useState(() => todayKey());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [subjectId, setSubjectId] = useState(data.subjects[0]?.id ?? '');
  const insets = useSafeAreaInsets();

  const dateOptions = useMemo(
    () =>
      buildRibbonDays(data.settings.firstLaunchDate).map((d) => format(d, 'yyyy-MM-dd')),
    [data.settings.firstLaunchDate]
  );

  const resetCamera = () => {
    setFrontUri(null);
    setBackUri(null);
    setShootingBack(false);
    setSaveState('idle');
    setStudyDate(todayKey());
    setStep('camera');
  };

  const takePhoto = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ quality: IMAGE_CAPTURE_QUALITY });
    if (!photo?.uri) return;

    if (shootingBack) {
      setBackUri(photo.uri);
      setShootingBack(false);
      setStep('save-sheet');
      return;
    }

    setFrontUri(photo.uri);
    setStep('answer-prompt');
  };

  const startBackCapture = () => {
    setShootingBack(true);
    setStep('camera');
  };

  const skipBackAndSave = () => {
    setSaveState('idle');
    setStep('save-sheet');
  };

  const save = async () => {
    if (!frontUri || !subjectId || saveState === 'saving') return;
    setSaveState('saving');
    try {
      const id = await captureFlashcardPair(frontUri, backUri, subjectId, studyDate);
      if (!id) {
        setSaveState('error');
        showMessage(t('capture.saveFailed'));
        return;
      }

      setSaveState('saved');
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setTimeout(() => {
        resetCamera();
        router.push('/(tabs)/vault');
      }, 1400);
    } catch {
      setSaveState('error');
      showMessage(t('capture.saveFailed'));
    }
  };

  if (!permission?.granted) {
    return (
      <View style={styles.permission}>
        <View style={styles.permissionBody}>
          <Text style={styles.permissionText}>{t('capture.permissionHint')}</Text>
          <Button label={t('capture.allowCamera')} onPress={requestPermission} />
        </View>
      </View>
    );
  }

  const cameraLabel = shootingBack ? t('capture.backShutter') : t('capture.frontShutter');
  const saveLabel =
    saveState === 'saving'
      ? t('capture.saving')
      : saveState === 'saved'
        ? t('capture.saved')
        : t('common.save');

  return (
    <View style={styles.flex}>
      <View style={[styles.tabHeader, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.tabTitle}>{t('tabs.capture')}</Text>
        {shootingBack && <Text style={styles.modeTag}>{t('capture.backMode')}</Text>}
      </View>

      {step === 'camera' && (
        <>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          <View style={[styles.dateOverlay, { top: insets.top + 72 }]}>
            <Text style={styles.dateText}>{studyDate}</Text>
          </View>
          {!shootingBack && (
            <View style={[styles.guideBanner, { top: insets.top + 124 }]}>
              <Text style={styles.guideText}>{t('capture.frontGuide')}</Text>
            </View>
          )}
          {shootingBack && (
            <View style={[styles.guideBanner, { top: insets.top + 124 }]}>
              <Text style={styles.guideText}>{t('capture.backGuide')}</Text>
            </View>
          )}
          <Pressable
            style={[styles.shutter, { bottom: insets.bottom + 88 }]}
            onPress={takePhoto}
            accessibilityLabel={cameraLabel}
          />
        </>
      )}

      <Modal visible={step === 'answer-prompt'} animationType="slide" transparent>
        <View style={styles.sheetBackdrop}>
          <View style={[styles.sheet, { paddingBottom: Math.max(36, insets.bottom + 20) }]}>
            <Text style={styles.sheetTitle}>{t('capture.pairTitle')}</Text>
            <Text style={styles.sheetBody}>{t('capture.pairBody')}</Text>
            {frontUri && <Image source={{ uri: frontUri }} style={styles.preview} />}
            <View style={styles.pairRow}>
              <View style={styles.pairSlot}>
                <Text style={styles.pairLabel}>{t('capture.frontLabel')}</Text>
                {frontUri && <Image source={{ uri: frontUri }} style={styles.pairThumb} />}
              </View>
              <View style={styles.pairSlot}>
                <Text style={styles.pairLabel}>{t('capture.backLabel')}</Text>
                <View style={styles.pairEmpty}>
                  <Text style={styles.pairEmptyText}>?</Text>
                </View>
              </View>
            </View>
            <Button label={t('capture.captureBack')} onPress={startBackCapture} />
            <Pressable onPress={skipBackAndSave} style={styles.skip}>
              <Text style={styles.skipText}>{t('capture.skipBack')}</Text>
            </Pressable>
            <Pressable onPress={resetCamera} style={styles.retake}>
              <Text style={styles.retakeText}>{t('capture.retake')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={step === 'save-sheet'} animationType="slide" transparent>
        <View style={styles.sheetBackdrop}>
          <View style={[styles.sheet, { paddingBottom: Math.max(36, insets.bottom + 20) }]}>
            {saveState === 'saved' ? (
              <View style={styles.successBanner}>
                <Text style={styles.successTitle}>✓ {t('capture.saved')}</Text>
                <Text style={styles.successBody}>{t('capture.savedHint')}</Text>
              </View>
            ) : null}

            <Text style={styles.sheetTitle}>{t('capture.saveTodayTitle')}</Text>
            <Pressable
              style={styles.datePickerBtn}
              onPress={saveState === 'saving' ? undefined : () => setDatePickerOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={t('capture.changeDate')}>
              <View>
                <Text style={styles.dateValue}>{studyDate}</Text>
                <Text style={styles.dateHint}>{t('capture.tapToChangeDate')}</Text>
              </View>
              <Text style={styles.dateChange}>{t('capture.changeDate')}</Text>
            </Pressable>

            <View style={styles.pairRow}>
              <View style={styles.pairSlot}>
                <Text style={styles.pairLabel}>{t('capture.frontLabel')}</Text>
                {frontUri && <Image source={{ uri: frontUri }} style={styles.pairThumb} />}
              </View>
              <View style={styles.pairSlot}>
                <Text style={styles.pairLabel}>{t('capture.backLabel')}</Text>
                {backUri ? (
                  <Image source={{ uri: backUri }} style={styles.pairThumb} />
                ) : (
                  <View style={styles.pairEmpty}>
                    <Text style={styles.pairEmptyText}>—</Text>
                  </View>
                )}
              </View>
            </View>
            <Text style={styles.chipLabel}>{t('capture.pickSubject')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
              {data.subjects.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => setSubjectId(s.id)}
                  style={[styles.chip, subjectId === s.id && styles.chipOn]}>
                  <Text style={[styles.chipText, subjectId === s.id && styles.chipTextOn]}>
                    {s.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Button
              label={saveLabel}
              onPress={save}
              disabled={saveState === 'saving' || saveState === 'saved'}
              style={saveState === 'saved' ? styles.saveBtnDone : undefined}
            />
            {saveState === 'saving' ? (
              <ActivityIndicator color={theme.orange} style={styles.saveSpinner} />
            ) : null}
            <Pressable
              onPress={saveState === 'saving' ? undefined : resetCamera}
              style={styles.retake}
              disabled={saveState === 'saving'}>
              <Text style={styles.retakeText}>{t('capture.retake')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={datePickerOpen} animationType="fade" transparent>
        <Pressable style={styles.dateModalBackdrop} onPress={() => setDatePickerOpen(false)}>
          <Pressable style={styles.dateModalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.dateModalTitle}>{t('capture.pickDate')}</Text>
            <ScrollView style={styles.dateList} keyboardShouldPersistTaps="handled">
              {dateOptions.map((d) => {
                const selected = d === studyDate;
                const label = format(parseISO(`${d}T12:00:00`), 'yyyy-MM-dd (EEE)');
                return (
                  <Pressable
                    key={d}
                    onPress={() => {
                      setStudyDate(d);
                      setDatePickerOpen(false);
                    }}
                    style={[styles.dateRow, selected && styles.dateRowOn]}>
                    <Text style={[styles.dateRowText, selected && styles.dateRowTextOn]}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable onPress={() => setDatePickerOpen(false)} style={styles.dateModalClose}>
              <Text style={styles.dateModalCloseText}>{t('common.cancel')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.blackPure },
  tabHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    paddingHorizontal: 20,
    paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  tabTitle: { fontSize: theme.font.heading, fontWeight: '800', color: theme.white },
  modeTag: { color: theme.orange, fontWeight: '800', fontSize: theme.font.caption, marginTop: 4 },
  camera: { flex: 1 },
  dateOverlay: {
    position: 'absolute',
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
    zIndex: 1,
  },
  dateText: { color: theme.white, fontSize: theme.font.body, fontWeight: '700' },
  guideBanner: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255,107,0,0.92)',
    padding: 14,
    borderRadius: theme.radius.md,
    zIndex: 1,
  },
  guideText: { color: theme.white, fontWeight: '700', textAlign: 'center', lineHeight: 20 },
  shutter: {
    position: 'absolute',
    left: '50%',
    marginLeft: -36,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.white,
    borderWidth: 4,
    borderColor: theme.orange,
    zIndex: 1,
  },
  permission: { flex: 1, backgroundColor: theme.beige },
  permissionBody: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  permissionText: { fontSize: theme.font.body, color: theme.gray, textAlign: 'center', lineHeight: 24 },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: theme.beige,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    padding: 24,
  },
  sheetTitle: { fontSize: theme.font.heading, fontWeight: '800', color: theme.black },
  sheetBody: { fontSize: theme.font.body, color: theme.gray, marginTop: 8, lineHeight: 22 },
  successBanner: {
    backgroundColor: theme.orangeMuted,
    borderWidth: 1,
    borderColor: theme.orange,
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 16,
  },
  successTitle: { fontSize: theme.font.body, fontWeight: '800', color: theme.black },
  successBody: { fontSize: theme.font.caption, fontWeight: '600', color: theme.gray, marginTop: 4 },
  datePickerBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.white,
    borderWidth: 1,
    borderColor: theme.grayLight,
    borderRadius: theme.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dateValue: { fontSize: theme.font.heading, fontWeight: '800', color: theme.black },
  dateHint: { fontSize: theme.font.caption, color: theme.gray, marginTop: 4, fontWeight: '600' },
  dateChange: { fontSize: theme.font.caption, fontWeight: '800', color: theme.orange },
  preview: { width: '100%', height: 160, borderRadius: theme.radius.md, marginTop: 16 },
  pairRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  pairSlot: { flex: 1, gap: 6 },
  pairLabel: { fontSize: 11, fontWeight: '800', color: theme.gray },
  pairThumb: { width: '100%', height: 100, borderRadius: theme.radius.sm, backgroundColor: theme.white },
  pairEmpty: {
    height: 100,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.white,
  },
  pairEmptyText: { color: theme.grayMuted, fontWeight: '700', fontSize: 24 },
  chipLabel: { fontSize: theme.font.caption, fontWeight: '700', color: theme.gray, marginTop: 16 },
  chips: { marginVertical: 12 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.grayLight,
    marginRight: 8,
    backgroundColor: theme.white,
  },
  chipOn: { backgroundColor: theme.orange, borderColor: theme.orange },
  chipText: { fontWeight: '700', color: theme.black },
  chipTextOn: { color: theme.white },
  saveBtnDone: { opacity: 0.85 },
  saveSpinner: { marginTop: 8 },
  skip: { marginTop: 12, alignItems: 'center' },
  skipText: { color: theme.gray, fontWeight: '600' },
  retake: { marginTop: 14, alignItems: 'center' },
  retakeText: { color: theme.gray, fontWeight: '600' },
  dateModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  dateModalSheet: {
    backgroundColor: theme.beige,
    borderRadius: theme.radius.lg,
    padding: 20,
    maxHeight: '70%',
  },
  dateModalTitle: { fontSize: theme.font.heading, fontWeight: '800', color: theme.black, marginBottom: 12 },
  dateList: { maxHeight: 320 },
  dateRow: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
    marginBottom: 4,
  },
  dateRowOn: { backgroundColor: theme.orangeMuted },
  dateRowText: { fontSize: theme.font.body, fontWeight: '600', color: theme.black },
  dateRowTextOn: { fontWeight: '800', color: theme.orange },
  dateModalClose: { marginTop: 12, alignItems: 'center', paddingVertical: 10 },
  dateModalCloseText: { fontWeight: '700', color: theme.gray },
});
