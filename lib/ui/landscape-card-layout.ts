import type { ViewportLayout } from '@/lib/ui/viewport-layout';

/** Landscape-oriented card: width ÷ height (e.g. 4 wide × 3 tall). */
export const LANDSCAPE_CARD_RATIO = 4 / 3;

/** React Native `aspectRatio` (width / height). */
export function landscapeCardAspectRatio(isLandscape: boolean, portraitSquare = true): number {
  if (isLandscape) return LANDSCAPE_CARD_RATIO;
  return portraitSquare ? 1 : LANDSCAPE_CARD_RATIO;
}

export function heightForLandscapeCardWidth(width: number, isLandscape: boolean): number {
  const aspect = landscapeCardAspectRatio(isLandscape);
  return Math.max(48, Math.round(width / aspect));
}

export type ReviewCardSizes = {
  width: number;
  height: number;
};

/** Problem + recall work cards in review session. */
export function computeReviewCardSizes(
  viewport: ViewportLayout,
  contentWidth: number,
  sidePad: number
): ReviewCardSizes {
  const innerW = Math.max(0, (contentWidth > 0 ? contentWidth : viewport.width) - sidePad * 2);
  if (!viewport.isLandscape) {
    const width = Math.max(260, Math.floor(innerW));
    const height = Math.round(width * 1.75);
    return { width, height };
  }
  const chrome = viewport.isPhone ? 120 : 160;
  const maxByHeight = Math.max(160, (viewport.shortEdge - chrome) * LANDSCAPE_CARD_RATIO);
  const width = Math.max(280, Math.min(Math.floor(innerW), Math.floor(maxByHeight)));
  const height = heightForLandscapeCardWidth(width, true);
  return { width, height };
}
