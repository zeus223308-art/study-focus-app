import * as ImageManipulator from 'expo-image-manipulator';

export type CropTransform = {
  imageWidth: number;
  imageHeight: number;
  cropWidth: number;
  cropHeight: number;
  /** Total scale from image pixels to viewport (cover scale × user zoom). */
  scale: number;
  translateX: number;
  translateY: number;
};

export function coverScale(
  imageWidth: number,
  imageHeight: number,
  cropWidth: number,
  cropHeight: number
): number {
  if (imageWidth < 1 || imageHeight < 1 || cropWidth < 1 || cropHeight < 1) return 1;
  return Math.max(cropWidth / imageWidth, cropHeight / imageHeight);
}

export function clampCropTransform(transform: CropTransform): CropTransform {
  const { imageWidth: iw, imageHeight: ih, cropWidth: cw, cropHeight: ch, scale } = transform;
  const w = iw * scale;
  const h = ih * scale;

  let translateX = transform.translateX;
  let translateY = transform.translateY;

  if (w >= cw) {
    const maxX = w / 2 - cw / 2;
    const minX = cw / 2 - w / 2;
    translateX = Math.min(maxX, Math.max(minX, translateX));
  } else {
    translateX = 0;
  }

  if (h >= ch) {
    const maxY = h / 2 - ch / 2;
    const minY = ch / 2 - h / 2;
    translateY = Math.min(maxY, Math.max(minY, translateY));
  } else {
    translateY = 0;
  }

  return { ...transform, translateX, translateY };
}

/** Map viewport crop window to pixel crop region on the source image. */
export function cropRegionFromTransform(transform: CropTransform): {
  originX: number;
  originY: number;
  width: number;
  height: number;
} {
  const { imageWidth: iw, imageHeight: ih, cropWidth: cw, cropHeight: ch, scale, translateX, translateY } =
    transform;

  const displayW = iw * scale;
  const displayH = ih * scale;
  const imageLeft = cw / 2 - displayW / 2 + translateX;
  const imageTop = ch / 2 - displayH / 2 + translateY;

  const originX = Math.max(0, Math.round((-imageLeft) / scale));
  const originY = Math.max(0, Math.round((-imageTop) / scale));
  const width = Math.min(iw - originX, Math.round(cw / scale));
  const height = Math.min(ih - originY, Math.round(ch / scale));

  return {
    originX,
    originY,
    width: Math.max(1, width),
    height: Math.max(1, height),
  };
}

export async function exportInteractiveCrop(uri: string, transform: CropTransform): Promise<string> {
  const crop = cropRegionFromTransform(transform);
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ crop }],
    { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}

export function initialCropTransform(
  imageWidth: number,
  imageHeight: number,
  cropWidth: number,
  cropHeight: number
): CropTransform {
  const scale = coverScale(imageWidth, imageHeight, cropWidth, cropHeight);
  return clampCropTransform({
    imageWidth,
    imageHeight,
    cropWidth,
    cropHeight,
    scale,
    translateX: 0,
    translateY: 0,
  });
}
