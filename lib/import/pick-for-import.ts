import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { ActionSheetIOS, Alert, Platform } from 'react-native';

import { IMAGE_CAPTURE_QUALITY } from '@/lib/files/image-quality';

export type PickedFile = {
  uri: string;
  mimeType: string | null;
  name: string | null;
};

export type PickImportResult =
  | { ok: true; files: PickedFile[] }
  | { ok: false; reason: 'denied' | 'canceled' };

type ImportSource = 'album' | 'files' | 'camera';

function isImageMime(mime: string | null | undefined): boolean {
  if (!mime) return true;
  return mime.startsWith('image/');
}

/** Ask user: photo album vs file picker (mobile-native where possible). */
export async function chooseImportSource(labels: {
  title: string;
  album: string;
  files: string;
  cancel: string;
  camera?: string;
}): Promise<ImportSource | 'cancel'> {
  const withCamera = Boolean(labels.camera);
  if (Platform.OS === 'ios') {
    return new Promise((resolve) => {
      const options = withCamera
        ? [labels.camera!, labels.album, labels.files, labels.cancel]
        : [labels.album, labels.files, labels.cancel];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          title: labels.title,
        },
        (index) => {
          if (withCamera) {
            if (index === 0) resolve('camera');
            else if (index === 1) resolve('album');
            else if (index === 2) resolve('files');
            else resolve('cancel');
          } else if (index === 0) resolve('album');
          else if (index === 1) resolve('files');
          else resolve('cancel');
        }
      );
    });
  }

  return new Promise((resolve) => {
    const buttons = [
      ...(withCamera ? [{ text: labels.camera!, onPress: () => resolve('camera' as const) }] : []),
      { text: labels.album, onPress: () => resolve('album' as const) },
      { text: labels.files, onPress: () => resolve('files' as const) },
      { text: labels.cancel, style: 'cancel' as const, onPress: () => resolve('cancel' as const) },
    ];
    Alert.alert(labels.title, undefined, buttons);
  });
}

/** Opens the device camera for a single capture (used from import flows). */
export async function pickFromCamera(): Promise<PickImportResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    return { ok: false, reason: 'denied' };
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: IMAGE_CAPTURE_QUALITY,
    ...(Platform.OS === 'ios'
      ? { presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN }
      : {}),
  });

  if (result.canceled || !result.assets[0]?.uri) {
    return { ok: false, reason: 'canceled' };
  }

  const asset = result.assets[0];
  return {
    ok: true,
    files: [
      {
        uri: asset.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
        name: asset.fileName ?? null,
      },
    ],
  };
}

/** Opens the device photo gallery / album (native on iOS & Android). */
export async function pickFromPhotoAlbum(): Promise<PickImportResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { ok: false, reason: 'denied' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    quality: IMAGE_CAPTURE_QUALITY,
    selectionLimit: 0,
    ...(Platform.OS === 'ios'
      ? { presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN }
      : {}),
  });

  if (result.canceled || !result.assets.length) {
    return { ok: false, reason: 'canceled' };
  }

  const files: PickedFile[] = result.assets
    .filter((a) => a.uri)
    .map((a) => ({
      uri: a.uri,
      mimeType: a.mimeType ?? 'image/jpeg',
      name: a.fileName ?? null,
    }));

  return files.length ? { ok: true, files } : { ok: false, reason: 'canceled' };
}

/** Opens system file picker (Downloads, Drive, iCloud, etc.). */
export async function pickFromFiles(): Promise<PickImportResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['image/*', 'application/pdf'],
    multiple: true,
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.length) {
    return { ok: false, reason: 'canceled' };
  }

  const files: PickedFile[] = result.assets
    .filter((a) => a.uri)
    .map((a) => ({
      uri: a.uri,
      mimeType: a.mimeType ?? null,
      name: a.name ?? null,
    }));

  return files.length ? { ok: true, files } : { ok: false, reason: 'canceled' };
}

export type PickImportLabels = {
  title: string;
  album: string;
  files: string;
  cancel: string;
  camera?: string;
  unsupportedOnly?: string;
  unsupportedSkipped?: string;
};

export async function pickForImport(labels: PickImportLabels): Promise<PickImportResult> {
  let picked: PickImportResult;

  if (Platform.OS === 'web') {
    picked = await pickFromFiles();
  } else {
    const source = await chooseImportSource(labels);
    if (source === 'cancel') return { ok: false, reason: 'canceled' };
    if (source === 'camera') picked = await pickFromCamera();
    else picked = source === 'album' ? await pickFromPhotoAlbum() : await pickFromFiles();
  }

  if (!picked.ok) return picked;

  const images = picked.files.filter((f) => isImageMime(f.mimeType));
  const skipped = picked.files.length - images.length;

  if (images.length === 0) {
    if (skipped > 0) {
      Alert.alert('', labels.unsupportedOnly ?? 'Only images are supported for now.');
    }
    return { ok: false, reason: 'canceled' };
  }

  if (skipped > 0 && labels.unsupportedSkipped) {
    Alert.alert('', labels.unsupportedSkipped);
  }

  return { ok: true, files: images };
}
