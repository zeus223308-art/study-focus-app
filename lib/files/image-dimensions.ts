import { Image } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

import { resolveImageUriForProcessing } from '@/hooks/useResolvedImageUri';

/** Reliable width/height for camera, content://, and gallery URIs. */
export async function loadImageDimensions(
  uri: string
): Promise<{ width: number; height: number }> {
  const tryGetSize = (target: string) =>
    new Promise<{ width: number; height: number }>((resolve, reject) => {
      Image.getSize(
        target,
        (width, height) => {
          if (width > 0 && height > 0) resolve({ width, height });
          else reject(new Error('invalid size'));
        },
        () => reject(new Error('getSize failed'))
      );
    });

  try {
    return await tryGetSize(uri);
  } catch {
    const resolved = await resolveImageUriForProcessing(uri);
    try {
      return await tryGetSize(resolved);
    } catch {
      const baked = await ImageManipulator.manipulateAsync(resolved, [], {
        compress: 1,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      if (baked.width > 0 && baked.height > 0) {
        return { width: baked.width, height: baked.height };
      }
      throw new Error('Could not read image dimensions');
    }
  }
}
