import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { ActionSheetIOS, Alert, Platform } from 'react-native';

export type PickedFile = {
  uri: string;
  mimeType: string | null;
  name: string | null;
};

export type PickImportResult =
  | { ok: true; files: PickedFile[] }
  | { ok: false; reason: 'denied' | 'canceled' };

type ImportSource = 'album' | 'files';

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
}): Promise<ImportSource | 'cancel'> {
  if (Platform.OS === 'ios') {
    return new Promise((resolve) => {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [labels.album, labels.files, labels.cancel],
          cancelButtonIndex: 2,
          title: labels.title,
        },
        (index) => {
          if (index === 0) resolve('album');
          else if (index === 1) resolve('files');
          else resolve('cancel');
        }
      );
    });
  }

  return new Promise((resolve) => {
    Alert.alert(labels.title, undefined, [
      { text: labels.album, onPress: () => resolve('album') },
      { text: labels.files, onPress: () => resolve('files') },
      { text: labels.cancel, style: 'cancel', onPress: () => resolve('cancel') },
    ]);
  });
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
    quality: 0.85,
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
    picked = source === 'album' ? await pickFromPhotoAlbum() : await pickFromFiles();
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
