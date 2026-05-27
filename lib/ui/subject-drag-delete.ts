import { Dimensions, Platform } from 'react-native';

export type DragLiftPoint = { x: number; y: number };

function windowHeight(override?: number): number {
  if (override != null && override > 0) return override;
  if (typeof window !== 'undefined') {
    const vh = window.visualViewport?.height ?? window.innerHeight;
    if (vh > 0) return vh;
  }
  return Dimensions.get('window').height;
}

/** Release here → confirm delete (no on-screen trash popup). */
export function isSubjectDragDeleteIntent(
  _pageX: number,
  pageY: number,
  lift: DragLiftPoint | null,
  heightOverride?: number
): boolean {
  if (!lift) return false;
  const h = windowHeight(heightOverride);
  const dy = pageY - lift.y;
  if (Platform.OS === 'web') {
    return dy >= 48 || pageY >= h * 0.58;
  }
  return pageY >= h * 0.58 || dy >= 48;
}
