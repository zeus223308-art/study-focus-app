import * as ImageManipulator from 'expo-image-manipulator';

export type CropRect = { left: number; top: number; width: number; height: number };

/** Draggable crop region over the photo (viewport coordinates). */
export type CropSelection = {
  imageWidth: number;
  imageHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  /** Pan offset from the default centered contain position. */
  imageOffsetX?: number;
  imageOffsetY?: number;
  crop: CropRect;
};

const MIN_CROP_SIZE = 48;

export function imageContainRect(
  imageWidth: number,
  imageHeight: number,
  viewportWidth: number,
  viewportHeight: number
): CropRect & { scale: number } {
  if (imageWidth < 1 || imageHeight < 1 || viewportWidth < 1 || viewportHeight < 1) {
    return { left: 0, top: 0, width: viewportWidth, height: viewportHeight, scale: 1 };
  }
  const scale = Math.min(viewportWidth / imageWidth, viewportHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  return {
    left: (viewportWidth - width) / 2,
    top: (viewportHeight - height) / 2,
    width,
    height,
    scale,
  };
}

export function imageDisplayRect(selection: CropSelection): CropRect & { scale: number } {
  const base = imageContainRect(
    selection.imageWidth,
    selection.imageHeight,
    selection.viewportWidth,
    selection.viewportHeight
  );
  return {
    ...base,
    left: base.left + (selection.imageOffsetX ?? 0),
    top: base.top + (selection.imageOffsetY ?? 0),
  };
}

function clampImageOffset(selection: CropSelection): CropSelection {
  const base = imageContainRect(
    selection.imageWidth,
    selection.imageHeight,
    selection.viewportWidth,
    selection.viewportHeight
  );
  const { crop } = selection;
  let ox = selection.imageOffsetX ?? 0;
  let oy = selection.imageOffsetY ?? 0;

  const minOx = crop.left + crop.width - base.left - base.width;
  const maxOx = crop.left - base.left;
  const minOy = crop.top + crop.height - base.top - base.height;
  const maxOy = crop.top - base.top;

  if (minOx <= maxOx) {
    ox = Math.min(Math.max(minOx, ox), maxOx);
  } else {
    ox = (minOx + maxOx) / 2;
  }
  if (minOy <= maxOy) {
    oy = Math.min(Math.max(minOy, oy), maxOy);
  } else {
    oy = (minOy + maxOy) / 2;
  }

  return { ...selection, imageOffsetX: ox, imageOffsetY: oy };
}

export function initialCropSelection(
  imageWidth: number,
  imageHeight: number,
  viewportWidth: number,
  viewportHeight: number
): CropSelection {
  const image = imageContainRect(imageWidth, imageHeight, viewportWidth, viewportHeight);
  const insetX = image.width * 0.05;
  const insetY = image.height * 0.05;
  return clampCropSelection({
    imageWidth,
    imageHeight,
    viewportWidth,
    viewportHeight,
    crop: {
      left: image.left + insetX,
      top: image.top + insetY,
      width: Math.max(MIN_CROP_SIZE, image.width - insetX * 2),
      height: Math.max(MIN_CROP_SIZE, image.height - insetY * 2),
    },
  });
}

export function clampCropSelection(
  selection: CropSelection,
  opts?: { lockImagePosition?: boolean }
): CropSelection {
  const base = opts?.lockImagePosition
    ? { ...selection, imageOffsetX: 0, imageOffsetY: 0 }
    : selection;
  const withPan = opts?.lockImagePosition ? base : clampImageOffset(base);
  const image = imageDisplayRect(withPan);

  const maxLeft = image.left + image.width - MIN_CROP_SIZE;
  const maxTop = image.top + image.height - MIN_CROP_SIZE;

  let left = Math.min(Math.max(image.left, withPan.crop.left), maxLeft);
  let top = Math.min(Math.max(image.top, withPan.crop.top), maxTop);

  let width = Math.max(MIN_CROP_SIZE, withPan.crop.width);
  let height = Math.max(MIN_CROP_SIZE, withPan.crop.height);

  if (left + width > image.left + image.width) width = image.left + image.width - left;
  if (top + height > image.top + image.height) height = image.top + image.height - top;

  if (width < MIN_CROP_SIZE) {
    width = MIN_CROP_SIZE;
    left = Math.min(left, image.left + image.width - MIN_CROP_SIZE);
  }
  if (height < MIN_CROP_SIZE) {
    height = MIN_CROP_SIZE;
    top = Math.min(top, image.top + image.height - MIN_CROP_SIZE);
  }

  return opts?.lockImagePosition
    ? { ...withPan, crop: { left, top, width, height } }
    : clampImageOffset({ ...withPan, crop: { left, top, width, height } });
}

export function cropRegionFromSelection(selection: CropSelection): {
  originX: number;
  originY: number;
  width: number;
  height: number;
} {
  const image = imageDisplayRect(selection);
  const { crop } = selection;
  const scale = image.scale;

  const originX = Math.max(0, Math.round((crop.left - image.left) / scale));
  const originY = Math.max(0, Math.round((crop.top - image.top) / scale));
  const width = Math.min(selection.imageWidth - originX, Math.round(crop.width / scale));
  const height = Math.min(selection.imageHeight - originY, Math.round(crop.height / scale));

  return {
    originX,
    originY,
    width: Math.max(1, width),
    height: Math.max(1, height),
  };
}

export async function exportCropSelection(uri: string, selection: CropSelection): Promise<string> {
  const crop = cropRegionFromSelection(selection);
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ crop }],
    { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}
