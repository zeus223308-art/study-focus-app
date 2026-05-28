import { Image } from 'react-native';

import { loadImageDimensions } from '@/lib/files/image-dimensions';
import { isDirectImageUri } from '@/lib/files/direct-image-uri';

/** True when the URI can be shown in Image / used for crop export. */
export async function verifyCaptureImageReadable(uri: string): Promise<boolean> {
  if (!uri?.trim()) return false;
  if (!isDirectImageUri(uri)) return false;

  try {
    await loadImageDimensions(uri);
    return true;
  } catch {
    return new Promise((resolve) => {
      Image.getSize(
        uri,
        (w, h) => resolve(w > 0 && h > 0),
        () => resolve(false)
      );
    });
  }
}
