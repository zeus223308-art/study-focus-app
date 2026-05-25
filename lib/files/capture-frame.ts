import * as ImageManipulator from 'expo-image-manipulator';

import type { CaptureFrameAspect } from '@/lib/domain/types';

export type { CaptureFrameAspect };

export const CAPTURE_FRAME_ASPECTS: CaptureFrameAspect[] = ['4:3', '3:4', '1:1', '16:9', 'full'];

export function frameAspectRatio(aspect: CaptureFrameAspect): number | null {
  switch (aspect) {
    case '4:3':
      return 4 / 3;
    case '3:4':
      return 3 / 4;
    case '1:1':
      return 1;
    case '16:9':
      return 16 / 9;
    default:
      return null;
  }
}

export function computeFrameRect(
  containerW: number,
  containerH: number,
  aspect: CaptureFrameAspect
): { left: number; top: number; width: number; height: number } {
  const ratio = frameAspectRatio(aspect);
  if (!ratio || containerW <= 0 || containerH <= 0) {
    return { left: 0, top: 0, width: containerW, height: containerH };
  }
  let width = containerW;
  let height = width / ratio;
  if (height > containerH) {
    height = containerH;
    width = height * ratio;
  }
  return {
    left: (containerW - width) / 2,
    top: (containerH - height) / 2,
    width,
    height,
  };
}

function centerCropRegion(
  imageW: number,
  imageH: number,
  ratio: number
): { originX: number; originY: number; width: number; height: number } {
  let cropW = imageW;
  let cropH = cropW / ratio;
  if (cropH > imageH) {
    cropH = imageH;
    cropW = cropH * ratio;
  }
  return {
    originX: Math.round((imageW - cropW) / 2),
    originY: Math.round((imageH - cropH) / 2),
    width: Math.round(cropW),
    height: Math.round(cropH),
  };
}

/** Center-crop image to the configured capture frame aspect. */
export async function cropImageToCaptureFrame(
  uri: string,
  aspect: CaptureFrameAspect
): Promise<string> {
  const ratio = frameAspectRatio(aspect);
  if (!ratio) return uri;

  const probe = await ImageManipulator.manipulateAsync(uri, [], {
    format: ImageManipulator.SaveFormat.JPEG,
  });
  const imageW = probe.width ?? 0;
  const imageH = probe.height ?? 0;
  if (imageW < 2 || imageH < 2) return uri;

  const crop = centerCropRegion(imageW, imageH, ratio);
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ crop }],
    { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}
