import { CameraView, useCameraPermissions } from 'expo-camera';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
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
import { CaptureTagPicker } from '@/components/capture/CaptureTagPicker';
import {
  useCaptureLeaveGuard,
  useCaptureLeaveRegistration,
} from '@/components/capture/CaptureLeaveGuard';
import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { mergeCaptureTagPresets } from '@/lib/domain/capture-tags';
import { IMAGE_CAPTURE_QUALITY } from '@/lib/files/image-quality';
import { pickForImport } from '@/lib/import/pick-for-import';
import { safeRouterBack } from '@/lib/navigation/safe-back';
import { ensureManipulableImageUri } from '@/lib/files/ensure-manipulable-uri';
import { stabilizeCaptureImageUri } from '@/lib/files/stabilize-capture-uri';
import { verifyCaptureImageReadable } from '@/lib/files/verify-capture-image';
import { BUTTON_LABEL_COMPACT, BUTTON_LABEL_LINK } from '@/lib/ui/button-label';
import { showMessage } from '@/lib/ui/confirm';
import { stopSheetPress } from '@/lib/ui/web-fixed-overlay';
import { formatStudyDateHeading } from '@/lib/ui/format-study-date';
import {
  clearCaptureDraft,
  readCaptureDraft,
  writeCaptureDraft,
} from '@/services/storage/capture-draft';

const sheetPressableProps =
  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : undefined;

type Step = 'camera' | 'edit' | 'answer-prompt' | 'save-sheet';
type EditSide = 'front' | 'back';
type EditSource = 'camera' | 'gallery';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const importPickLabels = (t: (key: string) => string) => ({
  title: t('folder.importSourceTitle'),
  camera: t('folder.importCamera'),
  album: t('folder.importAlbum'),
  files: t('folder.importFiles'),
  cancel: t('common.cancel'),
  unsupportedOnly: t('folder.importUnsupportedOnly'),
});

export default function CaptureTabScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { entry, fresh } = useLocalSearchParams<{ entry?: string; fresh?: string }>();
  const isImportEntry = entry === 'import';
  const isImportFresh = fresh === '1';
  const {
    data,
    localToday,
    captureFlashcardPair,
    activeFolderCapture,
    updateSettings,
    setTagColorFor,
    removeCaptureTag,
    renameCaptureTag,
    setPaywallVisible,
  } = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [step, setStep] = useState<Step>('camera');
  const [editUri, setEditUri] = useState<string | null>(null);
  const [editSide, setEditSide] = useState<EditSide>('front');
  const [editSource, setEditSource] = useState<EditSource>('camera');
  const [afterEditStep, setAfterEditStep] = useState<Step>('answer-prompt');
  const { setEditorFullscreen } = useCaptureLeaveGuard();
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [backUri, setBackUri] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [subjectId, setSubjectId] = useState(
    () => activeFolderCapture?.subjectId ?? data.subjects[0]?.id ?? ''
  );
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const tagPresets = useMemo(
    () => data.settings.captureTagPresets ?? [],
    [data.settings.captureTagPresets]
  );
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const hasSubjects = data.subjects.length > 0;
  const captureDateLabel = useMemo(
    () =>
      formatStudyDateHeading(localToday, data.settings.language, {
        today: t('folder.dateToday'),
        yesterday: t('folder.dateYesterday'),
      }),
    [localToday, data.settings.language, t]
  );

  const hasPendingCapture = step !== 'camera' || Boolean(frontUri || backUri);
  const folderCaptureSyncKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeFolderCapture?.subjectId) return;
    const syncKey = activeFolderCapture.subjectId;
    if (folderCaptureSyncKeyRef.current === syncKey) return;
    const exists = data.subjects.some((s) => s.id === activeFolderCapture.subjectId);
    if (!exists) return;
    folderCaptureSyncKeyRef.current = syncKey;
    setSubjectId(activeFolderCapture.subjectId);
  }, [activeFolderCapture, data.subjects]);

  const resetCamera = useCallback(() => {
    setEditUri(null);
    setFrontUri(null);
    setBackUri(null);
    setSaveState('idle');
    setSelectedTags([]);
    setEditSide('front');
    setStep('camera');
    void clearCaptureDraft();
  }, []);

  const addTagPreset = useCallback(
    (label: string) => {
      const next = mergeCaptureTagPresets(
        data.settings.captureTagPresets,
        data.settings.language,
        label
      );
      updateSettings({ captureTagPresets: next });
    },
    [data.settings.captureTagPresets, data.settings.language, updateSettings]
  );

  useCaptureLeaveRegistration(hasPendingCapture, resetCamera);

  useEffect(() => {
    // Hide top tabs for the whole post-shutter flow (edit → save), not just the editor.
    setEditorFullscreen(step !== 'camera');
    return () => setEditorFullscreen(false);
  }, [step, setEditorFullscreen]);

  const afterEditStepForSide = (side: EditSide): Step =>
    side === 'back' ? 'save-sheet' : 'answer-prompt';

  const draftRestoreOnce = useRef(false);
  const draftRestoreDoneRef = useRef(isImportEntry);
  const importEntryLaunched = useRef(false);
  const freshConsumedRef = useRef(false);
  const captureProgressRef = useRef({ front: false, back: false });
  const afterEditStepRef = useRef<Step>('answer-prompt');

  useEffect(() => {
    captureProgressRef.current = {
      front: Boolean(frontUri),
      back: Boolean(backUri),
    };
  }, [frontUri, backUri]);

  useEffect(() => {
    if (draftRestoreOnce.current || isImportEntry) {
      draftRestoreDoneRef.current = true;
      return;
    }
    draftRestoreOnce.current = true;
    let cancelled = false;
    void (async () => {
      try {
        const draft = await readCaptureDraft();
        if (cancelled || !draft?.frontUri) return;
        let didRestore = false;
        setFrontUri((cur) => {
          if (cur) return cur;
          didRestore = true;
          return draft.frontUri;
        });
        setBackUri((cur) => cur ?? draft.backUri);
        setSubjectId((cur) =>
          cur && data.subjects.some((s) => s.id === cur) ? cur : draft.subjectId
        );
        setSelectedTags((cur) => (cur.length > 0 ? cur : draft.selectedTags ?? []));
        setStep(draft.step === 'save-sheet' ? 'save-sheet' : 'answer-prompt');
        if (didRestore) showMessage(t('capture.draftRestored'));
      } finally {
        if (!cancelled) draftRestoreDoneRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data.subjects, isImportEntry, t]);

  useEffect(() => {
    if (!draftRestoreDoneRef.current) return;
    if (!frontUri) {
      void clearCaptureDraft();
      return;
    }
    const timer = setTimeout(() => {
      const stepForDraft: 'answer-prompt' | 'save-sheet' =
        step === 'save-sheet' ? 'save-sheet' : 'answer-prompt';
      void writeCaptureDraft({
        frontUri,
        backUri,
        subjectId,
        selectedTags,
        studyDate: localToday,
        step: stepForDraft,
        updatedAt: new Date().toISOString(),
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [frontUri, backUri, subjectId, localToday, selectedTags, step]);

  const openEditor = useCallback(
    (uri: string, side: EditSide, returnStep?: Step, source: EditSource = 'camera') => {
      const nextAfter = returnStep ?? afterEditStepForSide(side);
      afterEditStepRef.current = nextAfter;
      setEditUri(uri);
      setEditSide(side);
      setEditSource(source);
      setAfterEditStep(nextAfter);
      setStep('edit');
    },
    []
  );

  const onEditConfirm = async ({ uri }: { uri: string }) => {
    let previewUri = uri;
    try {
      previewUri = await stabilizeCaptureImageUri(uri);
    } catch {
      previewUri = uri;
    }

    let readable = await verifyCaptureImageReadable(previewUri);
    if (!readable) {
      try {
        const fixed = await stabilizeCaptureImageUri(
          await ensureManipulableImageUri(previewUri)
        );
        readable = await verifyCaptureImageReadable(fixed);
        if (readable) previewUri = fixed;
      } catch {
        readable = false;
      }
    }
    // Even if the readability probe is inconclusive (common on mobile web
    // blob/content URIs), keep the best available URI and advance to the save
    // sheet instead of dead-ending on a popup.
    if (!readable) previewUri = previewUri || uri;

    const nextStep = afterEditStepRef.current;
    if (editSide === 'front') setFrontUri(previewUri);
    else setBackUri(previewUri);
    setEditUri(null);
    setStep(nextStep);
  };

  const onEditRetake = () => {
    setEditUri(null);
    if (editSource === 'gallery') {
      const existingUri = editSide === 'front' ? frontUri : backUri;
      if (existingUri) {
        setStep(backUri ? 'save-sheet' : 'answer-prompt');
        return;
      }
      void pickFromGallery(editSide, { keepDraftOnCancel: true });
      setStep(frontUri || backUri ? 'answer-prompt' : 'camera');
      return;
    }
    setStep('camera');
  };

  const pickFromGallery = useCallback(
    async (
      side?: EditSide,
      opts?: { backOnCancel?: boolean; keepDraftOnCancel?: boolean }
    ) => {
      const targetSide = side ?? editSide;
      const picked = await pickForImport(importPickLabels(t));
      if (!picked.ok) {
        if (picked.reason === 'denied') showMessage(t('folder.importPermission'));
        if (opts?.backOnCancel && activeFolderCapture?.subjectId) {
          router.replace({
            pathname: '/folder/[id]',
            params: {
              id: activeFolderCapture.subjectId,
              studyDate: activeFolderCapture.studyDate,
            },
          });
          return;
        }
        if (opts?.keepDraftOnCancel && (frontUri || backUri)) {
          setStep(backUri ? 'save-sheet' : 'answer-prompt');
        }
        return;
      }
      const file = picked.files[0];
      if (!file) return;
      let uri = file.uri;
      try {
        uri = await ensureManipulableImageUri(file.uri);
        uri = await stabilizeCaptureImageUri(uri);
      } catch {
        uri = file.uri;
      }
      openEditor(uri, targetSide, afterEditStepForSide(targetSide), 'gallery');
    },
    [activeFolderCapture, backUri, editSide, frontUri, openEditor, router, t]
  );

  useFocusEffect(
    useCallback(() => {
      if (!isImportEntry) {
        importEntryLaunched.current = false;
        return;
      }

      // Treat the `fresh=1` intent as a one-shot. The focus effect re-runs
      // whenever pickFromGallery changes identity (e.g. after a photo is
      // confirmed and frontUri updates); without this guard each re-run would
      // wrongly reset the in-progress capture and relaunch the picker popup.
      const freshNow = isImportFresh && !freshConsumedRef.current;

      if (freshNow) {
        importEntryLaunched.current = false;
      }
      const hasProgress =
        captureProgressRef.current.front || captureProgressRef.current.back;
      if (!freshNow && hasProgress) {
        importEntryLaunched.current = true;
        return;
      }

      if (importEntryLaunched.current) return;
      importEntryLaunched.current = true;

      if (freshNow) {
        freshConsumedRef.current = true;
        setEditUri(null);
        setFrontUri(null);
        setBackUri(null);
        setSaveState('idle');
        setEditSide('front');
        setStep('camera');
        void clearCaptureDraft();
      }

      let pickerStarted = false;
      const id = setTimeout(() => {
        pickerStarted = true;
        void pickFromGallery('front', { backOnCancel: true });
      }, isWeb ? 0 : 350);
      return () => {
        clearTimeout(id);
        if (!pickerStarted) importEntryLaunched.current = false;
      };
    }, [isImportEntry, isImportFresh, isWeb, pickFromGallery])
  );

  const takePhoto = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ quality: IMAGE_CAPTURE_QUALITY });
    if (!photo?.uri) return;
    let uri = photo.uri;
    try {
      uri = await stabilizeCaptureImageUri(photo.uri);
    } catch {
      uri = photo.uri;
    }
    openEditor(uri, editSide, afterEditStepForSide(editSide), 'camera');
  };

  const startBackCapture = async () => {
    if (isWeb || !permission?.granted) {
      await pickFromGallery('back');
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
    await pickFromGallery(frontUri ? 'back' : 'front');
  };

  const save = async () => {
    if (!frontUri || !subjectId || saveState === 'saving' || saveState === 'saved') return false;
    setSaveState('saving');
    try {
      const stableFront = await stabilizeCaptureImageUri(frontUri);
      const stableBack = backUri ? await stabilizeCaptureImageUri(backUri) : null;
      const id = await captureFlashcardPair(
        stableFront,
        stableBack,
        subjectId,
        localToday,
        selectedTags.length > 0 ? selectedTags : undefined
      );
      if (!id) {
        setSaveState('error');
        showMessage(t('capture.saveFailedKeepDraft'));
        return false;
      }

      setSaveState('saved');
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      const savedSubjectId = subjectId;
      const savedStudyDate = localToday;
      setTimeout(() => {
        resetCamera();
        router.replace({
          pathname: '/folder/[id]',
          params: { id: savedSubjectId, studyDate: savedStudyDate },
        });
      }, 900);
      return true;
    } catch {
      setSaveState('error');
      showMessage(t('capture.saveFailedKeepDraft'));
      return false;
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
          <Pressable
            style={[styles.sheet, { paddingBottom: sheetBottom }]}
            onPress={stopSheetPress}
            {...sheetPressableProps}>
            <Text style={styles.sheetTitle}>{t('capture.pairTitle')}</Text>
            {frontUri ? (
              <CapturePreviewImage uri={frontUri} style={styles.preview} resizeMode="contain" />
            ) : null}
            <View style={styles.pairRow}>
              <View style={styles.pairSlot}>
                {frontUri ? (
                  <Pressable onPress={() => frontUri && openEditor(frontUri, 'front', 'answer-prompt')}>
                    <CapturePreviewImage uri={frontUri} style={styles.pairThumb} resizeMode="contain" />
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
          <Pressable
            style={[styles.sheet, { paddingBottom: sheetBottom }]}
            onPress={stopSheetPress}
            {...sheetPressableProps}>
            {saveState === 'saved' ? (
              <View style={styles.successBanner}>
                <Text style={styles.successTitle}>
                  {t('common.check')} {t('capture.saved')}
                </Text>
              </View>
            ) : null}

            <View style={styles.captureDateRow}>
              <Text style={styles.captureDateLabel}>{t('capture.captureDate')}</Text>
              <Text style={styles.captureDateValue}>{captureDateLabel}</Text>
            </View>

            <View style={styles.pairRow}>
              <View style={styles.pairSlot}>
                {frontUri ? (
                  <Pressable onPress={() => openEditor(frontUri, 'front', 'save-sheet')}>
                    <CapturePreviewImage uri={frontUri} style={styles.pairThumb} resizeMode="contain" />
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.pairSlot}>
                <Text style={styles.pairLabel}>{t('capture.backLabel')}</Text>
                {backUri ? (
                  <Pressable onPress={() => openEditor(backUri, 'back', 'save-sheet')}>
                    <CapturePreviewImage uri={backUri} style={styles.pairThumb} resizeMode="contain" />
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
                  {data.subjects.map((s) => {
                    const on = subjectId === s.id;
                    return (
                      <Pressable
                        key={s.id}
                        onPress={() => setSubjectId(s.id)}
                        accessibilityRole="button"
                        accessibilityState={on ? { selected: true } : {}}
                        style={({ pressed }) => [
                          styles.chip,
                          on && styles.chipOn,
                          pressed && (on ? styles.chipOnPressed : styles.chipPressed),
                        ]}>
                        {on ? (
                          <SymbolView
                            name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                            size={14}
                            tintColor={theme.onAccent}
                          />
                        ) : null}
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>{s.name}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <CaptureTagPicker
                  presets={tagPresets}
                  selectedTags={selectedTags}
                  language={data.settings.language}
                  onChangeSelected={setSelectedTags}
                  onAddPreset={addTagPreset}
                  onRemovePreset={removeCaptureTag}
                  onRenamePreset={renameCaptureTag}
                  tagColors={data.settings.tagColors}
                  tagColorFallback={data.settings.tagColor}
                  onSetTagColor={setTagColorFor}
                  isPro={data.settings.tier === 'pro'}
                  onRequirePremium={() => setPaywallVisible(true)}
                  disabled={saveBusy}
                />
                <Button
                  label={saveLabel}
                  onPress={() => void save()}
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

  const flowModals = renderModals();
  const inPostEditFlow =
    step === 'answer-prompt' || step === 'save-sheet' || Boolean(frontUri || backUri);

  if (step === 'edit' && editUri) {
    return (
      <>
        <CapturePhotoEditor
          uri={editUri}
          sideLabel={editSide === 'back' ? t('capture.backLabel') : ''}
          onConfirm={onEditConfirm}
          onRetake={onEditRetake}
        />
        {flowModals}
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
        {flowModals}
      </View>
    );
  }

  const needsCameraPermission = !permission?.granted && step === 'camera';

  if (needsCameraPermission) {
    return (
      <View style={styles.permission}>
        <View style={styles.permissionBody}>
          <Text style={styles.permissionText}>{t('capture.permissionHint')}</Text>
          <Button label={t('capture.allowCamera')} onPress={requestPermission} />
          <Button label={t('folder.importPhotos')} onPress={() => void pickFromGallery()} />
          <Button
            label={t('capture.goBack')}
            variant="ghost"
            onPress={() => safeRouterBack(router, '/(tabs)/vault')}
          />
        </View>
        {flowModals}
      </View>
    );
  }

  const cameraLabel = editSide === 'back' ? t('capture.backShutter') : t('capture.frontShutter');

  return (
    <View style={styles.flex}>
      {step === 'camera' && permission?.granted ? (
        <>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          <Pressable
            style={[styles.importBtn, { bottom: insets.bottom + 44 }]}
            onPress={() => void pickFromGallery()}
            accessibilityLabel={t('folder.importPhotos')}>
            <Text style={styles.importBtnText}>{t('folder.importPhotos')}</Text>
          </Pressable>
          <Pressable
            style={[styles.shutter, { bottom: insets.bottom + 40 }]}
            onPress={takePhoto}
            accessibilityLabel={cameraLabel}
          />
        </>
      ) : null}

      {flowModals}
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
  importBtn: {
    position: 'absolute',
    left: 20,
    zIndex: 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  importBtnText: { ...BUTTON_LABEL_COMPACT, color: theme.white },
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
    overflow: 'hidden',
  },
  sheetTitle: { fontSize: theme.font.heading, fontWeight: '800', color: theme.black },
  captureDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4,
  },
  captureDateLabel: {
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.gray,
  },
  captureDateValue: {
    flexShrink: 1,
    fontSize: theme.font.body,
    fontWeight: '800',
    color: theme.black,
    textAlign: 'right',
  },
  successBanner: {
    backgroundColor: theme.orangeMuted,
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
  chips: { marginVertical: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    borderWidth: 1.5,
    borderColor: theme.grayLight,
    marginRight: 8,
    backgroundColor: theme.surface,
  },
  chipPressed: {
    backgroundColor: theme.grayLight,
    borderColor: theme.gray,
  },
  chipOn: {
    backgroundColor: theme.orange,
    borderColor: theme.orange,
  },
  chipOnPressed: { opacity: 0.88 },
  chipText: { fontWeight: '700', color: theme.gray },
  chipTextOn: { color: theme.onAccent, fontWeight: '800' },
  saveBtnDone: { opacity: 0.85 },
  saveSpinner: { marginTop: 8 },
  retake: { marginTop: 14, alignItems: 'center' },
  retakeText: { ...BUTTON_LABEL_LINK, color: theme.gray },
});
