import * as ImageManipulator from 'expo-image-manipulator';

export type CropRect = { left: number; top: number; width: number; height: number };

/** Kakao-style: fixed crop window, user pans/zooms the photo underneath. */
export type CropTransform = {
  imageWidth: number;
  imageHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  crop: CropRect;
  scale: number;
  translateX: number;
  translateY: number;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

export function fixedCropWindow(viewportWidth: number, viewportHeight: number): CropRect {
  const inset = 16;
  const w = Math.max(0, viewportWidth - inset * 2);
  const h = Math.max(0, viewportHeight - inset * 2);
  return {
    left: (viewportWidth - w) / 2,
    top: (viewportHeight - h) / 2,
    width: w,
    height: h,
  };
}

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
  const { imageWidth: iw, imageHeight: ih, crop, scale } = transform;
  const w = iw * scale;
  const h = ih * scale;
  const cx = crop.left + crop.width / 2;
  const cy = crop.top + crop.height / 2;

  let translateX = transform.translateX;
  let translateY = transform.translateY;

  if (w >= crop.width) {
    const maxX = w / 2 - crop.width / 2;
    const minX = crop.width / 2 - w / 2;
    translateX = Math.min(maxX, Math.max(minX, translateX));
  } else {
    translateX = 0;
  }

  if (h >= crop.height) {
    const maxY = h / 2 - crop.height / 2;
    const minY = crop.height / 2 - h / 2;
    translateY = Math.min(maxY, Math.max(minY, translateY));
  } else {
    translateY = 0;
  }

  return { ...transform, translateX, translateY };
}

export function initialCropTransform(
  imageWidth: number,
  imageHeight: number,
  viewportWidth: number,
  viewportHeight: number
): CropTransform {
  const crop = fixedCropWindow(viewportWidth, viewportHeight);
  const scale = coverScale(imageWidth, imageHeight, crop.width, crop.height);
  return clampCropTransform({
    imageWidth,
    imageHeight,
    viewportWidth,
    viewportHeight,
    crop,
    scale,
    translateX: 0,
    translateY: 0,
  });
}

export function cropRegionFromTransform(transform: CropTransform): {
  originX: number;
  originY: number;
  width: number;
  height: number;
} {
  const { imageWidth: iw, imageHeight: ih, crop, scale, translateX, translateY } = transform;
  const displayW = iw * scale;
  const displayH = ih * scale;
  const imageLeft = crop.left + crop.width / 2 - displayW / 2 + translateX;
  const imageTop = crop.top + crop.height / 2 - displayH / 2 + translateY;

  const originX = Math.max(0, Math.round((crop.left - imageLeft) / scale));
  const originY = Math.max(0, Math.round((crop.top - imageTop) / scale));
  const width = Math.min(iw - originX, Math.round(crop.width / scale));
  const height = Math.min(ih - originY, Math.round(crop.height / scale));

  return {
    originX,
    originY,
    width: Math.max(1, width),
    height: Math.max(1, height),
  };
}

export async function exportCropTransform(uri: string, transform: CropTransform): Promise<string> {
  const crop = cropRegionFromTransform(transform);
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ crop }],
    { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}

export { MIN_ZOOM, MAX_ZOOM };
