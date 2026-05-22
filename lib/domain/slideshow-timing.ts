/** Front (problem) slide intervals in seconds */
export const FRONT_SLIDESHOW_SECONDS = [5, 10, 30] as const;

/** Back (answer) slide intervals — max 3 minutes */
export const ANSWER_SLIDESHOW_SECONDS = [10, 30, 60, 90, 120, 180] as const;

export const MAX_ANSWER_SLIDESHOW_SECONDS = 180;

export function formatAnswerSlideshowLabel(sec: number): string {
  if (sec === 180) return '3m';
  if (sec === 120) return '2m';
  if (sec === 60) return '1m';
  return `${sec}s`;
}

export function slideshowMsForSide(
  page: { slideshowSeconds: number; answerSlideshowSeconds?: number },
  side: 'front' | 'back'
): number {
  const sec =
    side === 'back'
      ? Math.min(
          page.answerSlideshowSeconds ?? page.slideshowSeconds ?? 10,
          MAX_ANSWER_SLIDESHOW_SECONDS
        )
      : page.slideshowSeconds ?? 10;
  return sec * 1000;
}
