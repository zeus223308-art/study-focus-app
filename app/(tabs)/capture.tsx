import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
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
import { Button } from '@/components/ui/Button';
import { StudyDateStepper } from '@/components/ui/StudyDateStepper';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { todayKey } from '@/lib/domain/dates';
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
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [subjectId, setSubjectId] = useState(data.subjects[0]?.id ?? '');
  const insets = useSafeAreaInsets();

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
            <StudyDateStepper
              studyDate={studyDate}
              onChange={setStudyDate}
              firstLaunchDate={data.settings.firstLaunchDate}
              variant="inline"
            />
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
              </View>
            ) : null}

            <Text style={styles.sheetTitle}>{t('capture.pickDate')}</Text>
            <View pointerEvents={saveState === 'saving' ? 'none' : 'auto'}>
              <StudyDateStepper
                studyDate={studyDate}
                onChange={setStudyDate}
                firstLaunchDate={data.settings.firstLaunchDate}
              />
            </View>

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
                    <Text style={styles.pairEmptyText}>?</Text>
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
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    zIndex: 1,
  },
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
    backgroundColor: theme.surface,
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
  preview: { width: '100%', height: 160, borderRadius: theme.radius.md, marginTop: 16 },
  pairRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  pairSlot: { flex: 1, gap: 6 },
  pairLabel: { fontSize: 11, fontWeight: '800', color: theme.gray },
  pairThumb: { width: '100%', height: 100, borderRadius: theme.radius.sm, backgroundColor: theme.surface },
  pairEmpty: {
    height: 100,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surface,
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
    backgroundColor: theme.surface,
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
});
