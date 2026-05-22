import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { format } from 'date-fns';

import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

type Step = 'camera' | 'confirmDate' | 'subject';

export default function CaptureScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, addItem, photoCount } = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [step, setStep] = useState<Step>('camera');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [studyDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [folderId, setFolderId] = useState(data.folders[0]?.id ?? '');

  const atLimit = photoCount >= data.settings.photoLimit;

  const takePhoto = async () => {
    if (atLimit) {
      Alert.alert('', `사진 한도 ${data.settings.photoLimit}장`);
      return;
    }
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
    if (!photo?.uri) return;
    const dir = `${FileSystem.documentDirectory}photos/`;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const dest = `${dir}${Date.now()}.jpg`;
    await FileSystem.copyAsync({ from: photo.uri, to: dest });
    setPhotoUri(dest);
    setStep('confirmDate');
  };

  const saveItem = () => {
    if (!photoUri || !folderId) return;
    const folder = data.folders.find((f) => f.id === folderId);
    addItem({
      folderId,
      studyDate,
      imageUri: photoUri,
      textNote: '',
      archived: false,
      tags: [],
      reviewScheduleId: folder?.reviewScheduleId ?? data.schedules[0].id,
      reviewAnchorDate: studyDate,
      slideshowSeconds: 10,
    });
    Alert.alert('', t('capture.saved'), [{ text: 'OK', onPress: () => router.back() }]);
  };

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Button label="카메라 허용" onPress={requestPermission} />
      </View>
    );
  }

  if (step === 'camera') {
    return (
      <View style={styles.flex}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          <View style={styles.dateOverlay}>
            <Text style={styles.dateText}>{format(new Date(), 'yyyy년 M월 d일')}</Text>
          </View>
        </CameraView>
        <Pressable style={styles.shutter} onPress={takePhoto} />
        <Pressable style={styles.close} onPress={() => router.back()}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
    );
  }

  if (step === 'confirmDate') {
    return (
      <View style={styles.centerPad}>
        <Text style={styles.modalTitle}>{t('capture.saveTodayTitle')}</Text>
        <Text style={styles.modalBody}>{t('capture.saveTodayMessage')}</Text>
        <Text style={styles.datePreview}>{studyDate}</Text>
        {photoUri && <Image source={{ uri: photoUri }} style={styles.preview} />}
        <Button label={t('capture.yes')} onPress={() => setStep('subject')} style={styles.fullBtn} />
      </View>
    );
  }

  return (
    <View style={styles.centerPad}>
      <Text style={styles.modalTitle}>{t('capture.pickSubject')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        {data.folders.map((f) => (
          <Pressable
            key={f.id}
            onPress={() => setFolderId(f.id)}
            style={[styles.subjectChip, folderId === f.id && styles.subjectChipOn]}>
            <Text style={[styles.subjectChipText, folderId === f.id && styles.subjectChipTextOn]}>
              {f.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {photoUri && <Image source={{ uri: photoUri }} style={styles.preview} />}
      <Button label={t('common.save')} onPress={saveItem} style={styles.fullBtn} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.black },
  camera: { flex: 1 },
  dateOverlay: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 8,
  },
  dateText: { color: theme.white, fontSize: 18, fontWeight: '600' },
  shutter: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.white,
    borderWidth: 4,
    borderColor: theme.accent,
  },
  close: { position: 'absolute', top: 48, right: 20 },
  closeText: { color: theme.white, fontSize: 28 },
  center: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: theme.beige },
  centerPad: { flex: 1, padding: 24, backgroundColor: theme.beige, justifyContent: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: theme.black },
  modalBody: { fontSize: 15, color: theme.gray, marginTop: 8 },
  datePreview: { fontSize: 22, fontWeight: '600', color: theme.accent, marginTop: 16 },
  preview: { width: '100%', height: 200, borderRadius: 12, marginTop: 16 },
  fullBtn: { marginTop: 16, width: '100%' },
  chips: { marginVertical: 16 },
  subjectChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.grayLight,
    marginRight: 8,
    backgroundColor: theme.white,
  },
  subjectChipOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  subjectChipText: { color: theme.black, fontWeight: '600' },
  subjectChipTextOn: { color: theme.white },
});
