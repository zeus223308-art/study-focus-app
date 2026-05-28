import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

import { IMAGE_CAPTURE_QUALITY } from '@/lib/files/image-quality';

const NATIVE_SCHEMES = ['file:', 'content:', 'ph:', 'assets-library:'];

function needsNativeNormalization(uri: string): boolean {
  if (Platform.OS === 'web') return false;
  return NATIVE_SCHEMES.some((prefix) => uri.startsWith(prefix));
}

/**
 * Copy gallery/camera URIs to a local file:// path so ImageManipulator and getSize work reliably.
 */
export async function ensureManipulableImageUri(uri: string): Promise<string> {
  if (!uri || Platform.OS === 'web') return uri;
  if (!needsNativeNormalization(uri)) return uri;

  const FileSystem = await import('expo-file-system/legacy');
  const dir = `${FileSystem.cacheDirectory}capture_work/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const dest = `${dir}work_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.jpg`;

  try {
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch {
    const baked = await ImageManipulator.manipulateAsync(uri, [], {
      compress: IMAGE_CAPTURE_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return baked.uri;
  }
}
