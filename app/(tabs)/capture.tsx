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
import { format } from 'date-fns';

import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

type Step = 'camera' | 'sheet';

export default function CaptureTabScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, capturePhoto } = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [step, setStep] = useState<Step>('camera');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [studyDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [subjectId, setSubjectId] = useState(data.subjects[0]?.id ?? '');

  const resetCamera = () => {
    setPhotoUri(null);
    setStep('camera');
  };

  const takePhoto = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.85 });
    if (!photo?.uri) return;
    setPhotoUri(photo.uri);
    setStep('sheet');
  };

  const save = async () => {
    if (!photoUri || !subjectId) return;
    const id = await capturePhoto(photoUri, subjectId, studyDate);
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
        <ScreenHeader title={t('tabs.capture')} showSettings={false} />
        <View style={styles.permissionBody}>
          <Text style={styles.permissionText}>{t('capture.permissionHint')}</Text>
          <Button label={t('capture.allowCamera')} onPress={requestPermission} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>{t('tabs.capture')}</Text>
      </View>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      <View style={styles.dateOverlay}>
        <Text style={styles.dateText}>{format(new Date(), 'yyyy-MM-dd')}</Text>
      </View>
      <Pressable style={styles.shutter} onPress={takePhoto} accessibilityLabel={t('capture.shutter')} />

      <Modal visible={step === 'sheet'} animationType="slide" transparent onRequestClose={resetCamera}>
        <View style={styles.sheetBackdrop}>
          <Pressable style={styles.sheetDismiss} onPress={resetCamera} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t('capture.saveTodayTitle')}</Text>
            <Text style={styles.sheetBody}>{studyDate}</Text>
            {photoUri && <Image source={{ uri: photoUri }} style={styles.preview} />}
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
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  tabTitle: { fontSize: theme.font.heading, fontWeight: '800', color: theme.white },
  camera: { flex: 1 },
  dateOverlay: {
    position: 'absolute',
    top: 108,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
    zIndex: 1,
  },
  dateText: { color: theme.white, fontSize: theme.font.body, fontWeight: '700' },
  shutter: {
    position: 'absolute',
    bottom: 100,
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
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheetDismiss: { flex: 1 },
  sheet: {
    backgroundColor: theme.beige,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    padding: 24,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.grayLight,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: { fontSize: theme.font.heading, fontWeight: '800', color: theme.black },
  sheetBody: { fontSize: theme.font.body, color: theme.orange, fontWeight: '700', marginTop: 8 },
  preview: { width: '100%', height: 180, borderRadius: theme.radius.md, marginTop: 16 },
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
  retake: { marginTop: 14, alignItems: 'center' },
  retakeText: { color: theme.gray, fontWeight: '600' },
});
