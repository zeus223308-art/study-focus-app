import type { InkStroke, NotePage } from '@/lib/domain/types';

import { OCR_PASS_THRESHOLD, scoreRecallAgainstAnswer } from './ocr-score';

export function getAnswerTextForGrading(page: NotePage): string {
  if (page.answerOcrText.trim()) return page.answerOcrText.trim();
  if (page.textNote.trim()) return page.textNote.trim();
  return '';
}

export function getAnswerImageUri(page: NotePage): string | null {
  const a = page.answerAsset;
  if (!a) return null;
  return a.originalLocalUri ?? a.thumbnailUri ?? null;
}

export function strokesInkWeight(strokes: InkStroke[]): number {
  return strokes.reduce((n, s) => n + s.points.length, 0);
}

/** Grade pen recall on white canvas vs registered back OCR / note */
export function scoreActiveRecall(strokes: InkStroke[], page: NotePage): number {
  const ink = strokesInkWeight(strokes);
  if (ink < 12) return 0;

  const answerText = getAnswerTextForGrading(page);
  if (!answerText) {
    return page.answerAsset && ink >= 40 ? 72 : ink >= 25 ? 55 : 0;
  }

  const textScore = scoreRecallAgainstAnswer(`recall_${Math.round(ink / 8)}`, answerText);
  const effortBonus = ink >= 80 ? 12 : ink >= 40 ? 6 : 0;
  return Math.min(100, textScore + effortBonus);
}

export { OCR_PASS_THRESHOLD };
