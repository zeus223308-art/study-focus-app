import type { NotePage } from '@/lib/domain/types';

const STUDY_CHAR =
  /[0-9a-zA-Z가-힣α-ωΑ-Ω∫∑√πθ±×÷=<>≤≥^_%.,;:!?'"()[\]{}\\/\-–—]/;

const MATH_OR_SYMBOL = /[=+\-×÷∫∑√π≤≥<>^_%]/;

/** Problem photos with study content (text, numbers, formulas, etc.) can be scored. */
export function isProblemGradable(page: NotePage): boolean {
  const text = (page.ocrText ?? '').trim();
  if (text.length < 2) return false;

  const compact = text.replace(/\s+/g, '');
  if (compact.length < 2) return false;

  let studyChars = 0;
  for (const ch of compact) {
    if (STUDY_CHAR.test(ch)) studyChars += 1;
  }
  const ratio = studyChars / compact.length;
  if (ratio < 0.35) return false;

  const hasLetter = /[a-zA-Z가-힣]/.test(text);
  const hasDigit = /\d/.test(text);
  if (hasLetter || hasDigit || MATH_OR_SYMBOL.test(text)) return true;

  return compact.length >= 6;
}
