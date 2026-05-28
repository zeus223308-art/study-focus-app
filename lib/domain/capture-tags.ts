import type { Language } from './types';

/** Legacy stored tag id (search / filters). */
export const EXAM_TAG_LEGACY = 'exam';

export function defaultCaptureTagPreset(language: Language): string {
  return language === 'ko' ? '시험 직전' : 'Before exam';
}

export function normalizeCaptureTagLabel(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, 40);
}

/** Deduped preset list for the save sheet (default tag always first). */
export function normalizeCaptureTagPresets(
  presets: string[] | undefined,
  language: Language
): string[] {
  const defaultTag = defaultCaptureTagPreset(language);
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (label: string) => {
    const n = normalizeCaptureTagLabel(label);
    if (!n) return;
    const key = n.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(n);
  };
  push(defaultTag);
  for (const p of presets ?? []) push(p);
  return out;
}

export function isExamBeforeTag(tag: string): boolean {
  const t = tag.toLowerCase();
  return t === EXAM_TAG_LEGACY || t === '시험 직전' || t === 'before exam';
}

export function toggleCaptureTag(selected: string[], tag: string): string[] {
  const n = normalizeCaptureTagLabel(tag);
  if (!n) return selected;
  const key = n.toLowerCase();
  if (selected.some((s) => s.toLowerCase() === key)) {
    return selected.filter((s) => s.toLowerCase() !== key);
  }
  return [...selected, n];
}

export function mergeCaptureTagPresets(
  current: string[] | undefined,
  language: Language,
  newLabel: string
): string[] {
  const normalized = normalizeCaptureTagLabel(newLabel);
  if (!normalized) return normalizeCaptureTagPresets(current, language);
  return normalizeCaptureTagPresets([...(current ?? []), normalized], language);
}
