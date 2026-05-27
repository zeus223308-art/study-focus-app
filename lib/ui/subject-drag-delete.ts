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

/** Show trash popup when finger moves down toward the home-indicator side. */
export function shouldShowVaultTrashPopup(
  pageY: number,
  lift: DragLiftPoint | null,
  heightOverride?: number
): boolean {
  if (!lift) return false;
  const h = windowHeight(heightOverride);
  const dy = pageY - lift.y;
  if (dy < 6) return false;
  if (Platform.OS === 'web') {
    return dy >= 14;
  }
  return dy >= 20 || pageY >= h * 0.4;
}

/** Release here → confirm delete. */
export function isSubjectDragDeleteIntent(
  _pageX: number,
  pageY: number,
  lift: DragLiftPoint | null,
  heightOverride?: number
): boolean {
  if (!lift) return false;
  const h = windowHeight(heightOverride);
  const dy = pageY - lift.y;
  return pageY >= h * 0.58 || dy >= 48;
}
