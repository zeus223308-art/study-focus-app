import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';

import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

type Step = 'camera' | 'answer-prompt' | 'save-sheet';

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
  const [studyDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [subjectId, setSubjectId] = useState(data.subjects[0]?.id ?? '');
  const insets = useSafeAreaInsets();

  const resetCamera = () => {
    setFrontUri(null);
    setBackUri(null);
    setShootingBack(false);
    setStep('camera');
  };

  const takePhoto = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.85 });
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
    setStep('save-sheet');
  };

  const save = async () => {
    if (!frontUri || !subjectId) return;
    const id = await captureFlashcardPair(frontUri, backUri, subjectId, studyDate);
    if (id) {
      Alert.alert('', t('capture.saved'), [
        {
          text: 'OK',
          onPress: () => {
            resetCamera();
            router.push('/(tabs)/vault');
          },
        },
      ]);
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
            <Text style={styles.dateText}>{format(new Date(), 'yyyy-MM-dd')}</Text>
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
            <Text style={styles.sheetTitle}>{t('capture.saveTodayTitle')}</Text>
            <Text style={styles.sheetBody}>{studyDate}</Text>
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
            <Button label={t('common.save')} onPress={save} />
            <Pressable onPress={resetCamera} style={styles.retake}>
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
  skip: { marginTop: 12, alignItems: 'center' },
  skipText: { color: theme.gray, fontWeight: '600' },
  retake: { marginTop: 14, alignItems: 'center' },
  retakeText: { color: theme.gray, fontWeight: '600' },
});
