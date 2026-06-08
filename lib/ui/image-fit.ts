/** Largest rect with aspect h/w that fits in a box without cropping or stretching. */
export function fitImageInBox(boxW: number, boxH: number, aspect: number) {
  const safeAspect = aspect > 0 ? aspect : 4 / 3;
  const heightIfFullWidth = boxW * safeAspect;
  if (heightIfFullWidth <= boxH) {
    return { width: boxW, height: Math.max(1, Math.round(heightIfFullWidth)) };
  }
  return { width: Math.max(1, Math.round(boxH / safeAspect)), height: boxH };
}
