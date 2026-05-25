import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
import { CapturePhotoEditor } from '@/components/capture/CapturePhotoEditor';
import { CapturePreviewImage } from '@/components/capture/CapturePreviewImage';
import { Button } from '@/components/ui/Button';
import { StudyDateStepper } from '@/components/ui/StudyDateStepper';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { todayKey } from '@/lib/domain/dates';
import { IMAGE_CAPTURE_QUALITY } from '@/lib/files/image-quality';
import { pickForImport } from '@/lib/import/pick-for-import';
import { safeRouterBack } from '@/lib/navigation/safe-back';
import { stabilizeCaptureImageUri } from '@/lib/files/stabilize-capture-uri';
import { showMessage } from '@/lib/ui/confirm';

type Step = 'camera' | 'edit' | 'answer-prompt' | 'save-sheet';
type EditSide = 'front' | 'back';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function CaptureTabScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, captureFlashcardPair } = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [step, setStep] = useState<Step>('camera');
  const [editUri, setEditUri] = useState<string | null>(null);
  const [editSide, setEditSide] = useState<EditSide>('front');
  const [afterEditStep, setAfterEditStep] = useState<Step>('answer-prompt');
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [backUri, setBackUri] = useState<string | null>(null);
  const [studyDate, setStudyDate] = useState(() => todayKey());
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [subjectId, setSubjectId] = useState(data.subjects[0]?.id ?? '');
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const hasSubjects = data.subjects.length > 0;

  useEffect(() => {
    if (!subjectId && data.subjects[0]) {
      setSubjectId(data.subjects[0].id);
    }
  }, [data.subjects, subjectId]);

  const resetCamera = () => {
    setEditUri(null);
    setFrontUri(null);
    setBackUri(null);
    setSaveState('idle');
    setStudyDate(todayKey());
    setEditSide('front');
    setStep('camera');
  };

  const openEditor = (uri: string, side: EditSide, returnStep?: Step) => {
    setEditUri(uri);
    setEditSide(side);
    setAfterEditStep(returnStep ?? (side === 'back' ? 'save-sheet' : 'answer-prompt'));
    setStep('edit');
  };

  const onEditConfirm = async ({ uri }: { uri: string }) => {
    const previewUri = await stabilizeCaptureImageUri(uri);
    if (editSide === 'front') setFrontUri(previewUri);
    else setBackUri(previewUri);
    setEditUri(null);
    setStep(afterEditStep);
  };

  const onEditRetake = () => {
    setEditUri(null);
    setStep('camera');
  };

  const takePhoto = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ quality: IMAGE_CAPTURE_QUALITY });
    if (!photo?.uri) return;
    openEditor(photo.uri, editSide);
  };

  const startBackCapture = async () => {
    if (isWeb) {
      const picked = await pickForImport({
        title: t('capture.importWeb'),
        album: t('folder.importAlbum'),
        files: t('folder.importFiles'),
        cancel: t('common.cancel'),
        unsupportedOnly: t('folder.importUnsupportedOnly'),
      });
      if (!picked.ok || picked.files.length === 0) return;
      openEditor(picked.files[0].uri, 'back');
      return;
    }
    setEditSide('back');
    setStep('camera');
  };

  const goToSaveSheet = () => {
    setSaveState('idle');
    setStep('save-sheet');
  };

  const dismissAnswerPrompt = () => {
    if (editSide === 'back') return;
    setFrontUri(null);
    resetCamera();
  };

  const dismissSaveSheet = () => {
    if (saveState === 'saving' || saveState === 'saved') return;
    setStep('answer-prompt');
  };

  const pickWebImage = async () => {
    const picked = await pickForImport({
      title: t('capture.importWeb'),
      album: t('folder.importAlbum'),
      files: t('folder.importFiles'),
      cancel: t('common.cancel'),
      unsupportedOnly: t('folder.importUnsupportedOnly'),
    });
    if (!picked.ok || picked.files.length === 0) return;
    openEditor(picked.files[0].uri, frontUri ? 'back' : 'front');
  };

  const save = async () => {
    if (!frontUri || !subjectId || saveState === 'saving' || saveState === 'saved') return;
    setSaveState('saving');
    try {
      const stableFront = await stabilizeCaptureImageUri(frontUri);
      const stableBack = backUri ? await stabilizeCaptureImageUri(backUri) : null;
      const id = await captureFlashcardPair(stableFront, stableBack, subjectId, studyDate);
      if (!id) {
        setSaveState('error');
        showMessage(t('capture.saveFailed'));
        return;
      }

      setSaveState('saved');
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      const savedSubjectId = subjectId;
      setTimeout(() => {
        resetCamera();
        router.replace({
          pathname: '/folder/[id]',
          params: { id: savedSubjectId },
        });
      }, 900);
    } catch {
      setSaveState('error');
      showMessage(t('capture.saveFailed'));
    }
  };

  const sheetBottom = Math.max(36, insets.bottom + 20);
  const saveBusy = saveState === 'saving' || saveState === 'saved';
  const saveLabel =
    saveState === 'saving'
      ? t('capture.saving')
      : saveState === 'saved'
        ? t('capture.saved')
        : t('common.save');

  const renderModals = () => (
    <>
      <Modal
        visible={step === 'answer-prompt'}
        animationType="slide"
        transparent
        onRequestClose={dismissAnswerPrompt}>
        <Pressable style={styles.sheetBackdrop} onPress={dismissAnswerPrompt}>
          <Pressable style={[styles.sheet, { paddingBottom: sheetBottom }]} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{t('capture.pairTitle')}</Text>
            {frontUri ? (
              <CapturePreviewImage uri={frontUri} style={styles.preview} resizeMode="cover" />
            ) : null}
            <View style={styles.pairRow}>
              <View style={styles.pairSlot}>
                <Text style={styles.pairLabel}>{t('capture.frontLabel')}</Text>
                {frontUri ? (
                  <Pressable onPress={() => frontUri && openEditor(frontUri, 'front', 'answer-prompt')}>
                    <CapturePreviewImage uri={frontUri} style={styles.pairThumb} resizeMode="cover" />
                    <Text style={styles.editLink}>{t('capture.editPhoto')}</Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.pairSlot}>
                <Text style={styles.pairLabel}>{t('capture.backLabel')}</Text>
                <View style={styles.pairEmpty}>
                  <Text style={styles.pairEmptyText}>—</Text>
                </View>
              </View>
            </View>
            <Button label={t('capture.saveFrontOnly')} onPress={goToSaveSheet} />
            <Button label={t('capture.captureBack')} variant="ghost" onPress={startBackCapture} />
            <Pressable onPress={resetCamera} style={styles.retake}>
              <Text style={styles.retakeText}>{t('capture.retake')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={step === 'save-sheet'}
        animationType="slide"
        transparent
        onRequestClose={dismissSaveSheet}>
        <Pressable style={styles.sheetBackdrop} onPress={dismissSaveSheet}>
          <Pressable style={[styles.sheet, { paddingBottom: sheetBottom }]} onPress={() => {}}>
            {saveState === 'saved' ? (
              <View style={styles.successBanner}>
                <Text style={styles.successTitle}>
                  {t('common.check')} {t('capture.saved')}
                </Text>
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
                {frontUri ? (
                  <Pressable onPress={() => openEditor(frontUri, 'front', 'save-sheet')}>
                    <CapturePreviewImage uri={frontUri} style={styles.pairThumb} resizeMode="cover" />
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.pairSlot}>
                <Text style={styles.pairLabel}>{t('capture.backLabel')}</Text>
                {backUri ? (
                  <Pressable onPress={() => openEditor(backUri, 'back', 'save-sheet')}>
                    <CapturePreviewImage uri={backUri} style={styles.pairThumb} resizeMode="cover" />
                  </Pressable>
                ) : (
                  <View style={styles.pairEmpty}>
                    <Text style={styles.pairEmptyText}>—</Text>
                  </View>
                )}
              </View>
            </View>

            {!hasSubjects ? (
              <View style={styles.noSubjectsBlock}>
                <Text style={styles.noSubjectsHint}>{t('capture.noSubjectsHint')}</Text>
                <Button
                  label={t('capture.goToVault')}
                  onPress={() => {
                    dismissSaveSheet();
                    router.push('/(tabs)/vault');
                  }}
                />
              </View>
            ) : (
              <>
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
                  disabled={saveBusy || !subjectId}
                  style={saveState === 'saved' ? styles.saveBtnDone : undefined}
                />
              </>
            )}

            {saveState === 'saving' ? (
              <ActivityIndicator color={theme.orange} style={styles.saveSpinner} />
            ) : null}
            {!backUri && hasSubjects && !saveBusy ? (
              <Button label={t('capture.captureBack')} variant="ghost" onPress={startBackCapture} />
            ) : null}
            <Pressable
              onPress={saveBusy ? undefined : resetCamera}
              style={styles.retake}
              disabled={saveBusy}>
              <Text style={styles.retakeText}>{t('capture.retake')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );

  if (step === 'edit' && editUri) {
    return (
      <>
        <CapturePhotoEditor
          uri={editUri}
          sideLabel={editSide === 'back' ? t('capture.backLabel') : t('capture.frontLabel')}
          onConfirm={onEditConfirm}
          onRetake={onEditRetake}
        />
        {renderModals()}
      </>
    );
  }

  if (isWeb) {
    return (
      <View style={styles.permission}>
        <View style={[styles.tabHeader, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.tabTitleWeb}>{t('tabs.capture')}</Text>
        </View>
        <View style={styles.permissionBody}>
          <Text style={styles.permissionText}>{t('capture.importWebHint')}</Text>
          <Button label={t('capture.importWeb')} onPress={pickWebImage} />
          {!hasSubjects ? (
            <>
              <Text style={styles.noSubjectsHint}>{t('capture.noSubjectsHint')}</Text>
              <Button
                label={t('capture.goToVault')}
                variant="ghost"
                onPress={() => router.push('/(tabs)/vault')}
              />
            </>
          ) : null}
          <Button
            label={t('capture.goBack')}
            variant="ghost"
            onPress={() => safeRouterBack(router, '/(tabs)/vault')}
          />
        </View>
        {renderModals()}
      </View>
    );
  }

  if (!permission?.granted) {
    return (
      <View style={styles.permission}>
        <View style={styles.permissionBody}>
          <Text style={styles.permissionText}>{t('capture.permissionHint')}</Text>
          <Button label={t('capture.allowCamera')} onPress={requestPermission} />
          <Button
            label={t('capture.goBack')}
            variant="ghost"
            onPress={() => safeRouterBack(router, '/(tabs)/vault')}
          />
        </View>
      </View>
    );
  }

  const cameraLabel = editSide === 'back' ? t('capture.backShutter') : t('capture.frontShutter');

  return (
    <View style={styles.flex}>
      {step === 'camera' && (
        <>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          <Pressable
            style={[styles.shutter, { bottom: insets.bottom + 40 }]}
            onPress={takePhoto}
            accessibilityLabel={cameraLabel}
          />
        </>
      )}

      {renderModals()}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.blackPure },
  tabHeader: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  tabTitleWeb: { fontSize: theme.font.heading, fontWeight: '800', color: theme.black },
  noSubjectsHint: {
    fontSize: theme.font.caption,
    color: theme.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
  noSubjectsBlock: { marginTop: 12, gap: 10 },
  camera: { flex: 1 },
  frameLabel: {
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.gray,
    textAlign: 'center',
  },
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
    zIndex: 2,
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
  successBanner: {
    backgroundColor: theme.orangeMuted,
    borderWidth: 1,
    borderColor: theme.orange,
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 16,
  },
  successTitle: { fontSize: theme.font.body, fontWeight: '800', color: theme.black },
  preview: { width: '100%', height: 160, borderRadius: theme.radius.md, marginTop: 16 },
  pairRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  pairSlot: { flex: 1, gap: 6 },
  pairLabel: { fontSize: 11, fontWeight: '800', color: theme.gray },
  pairThumb: { width: '100%', height: 100, borderRadius: theme.radius.sm, backgroundColor: theme.surface },
  editLink: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.orange,
    textAlign: 'center',
    marginTop: 4,
  },
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
  retake: { marginTop: 14, alignItems: 'center' },
  retakeText: { color: theme.gray, fontWeight: '600' },
});
