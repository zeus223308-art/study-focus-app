import type { InkPoint, InkStroke } from '@/lib/domain/types';

import {
  clampCropSelection,
  imageContainRect,
  type CropSelection,
} from './interactive-crop';

/** Matches expo-image-manipulator `{ rotate: 90 }` (clockwise). */
export function rotateInkPointsCW90(points: InkPoint[], displayWidth: number): InkPoint[] {
  return points.map(({ x, y }) => ({
    x: y,
    y: displayWidth - x,
  }));
}

export function rotateStrokesCW90(
  strokes: InkStroke[],
  displayWidth: number
): InkStroke[] {
  return strokes.map((stroke) => ({
    ...stroke,
    points: rotateInkPointsCW90(stroke.points, displayWidth),
  }));
}

/** Rotate crop box with the image (viewport coordinates). */
export function rotateCropSelectionCW90(selection: CropSelection): CropSelection {
  const image = imageContainRect(
    selection.imageWidth,
    selection.imageHeight,
    selection.viewportWidth,
    selection.viewportHeight
  );
  const { crop } = selection;
  const lx = crop.left - image.left;
  const ly = crop.top - image.top;
  const lw = crop.width;
  const lh = crop.height;
  const iw = image.width;

  const newImageW = selection.imageHeight;
  const newImageH = selection.imageWidth;
  const newImage = imageContainRect(
    newImageW,
    newImageH,
    selection.viewportWidth,
    selection.viewportHeight
  );

  return clampCropSelection({
    imageWidth: newImageW,
    imageHeight: newImageH,
    viewportWidth: selection.viewportWidth,
    viewportHeight: selection.viewportHeight,
    crop: {
      left: newImage.left + ly,
      top: newImage.top + (iw - lx - lw),
      width: lh,
      height: lw,
    },
  });
}

export function selectionMatchesLayout(
  selection: CropSelection,
  imageWidth: number,
  imageHeight: number,
  viewportWidth: number,
  viewportHeight: number
): boolean {
  return (
    selection.imageWidth === imageWidth &&
    selection.imageHeight === imageHeight &&
    selection.viewportWidth === viewportWidth &&
    selection.viewportHeight === viewportHeight
  );
}
