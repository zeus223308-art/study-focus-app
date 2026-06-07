import type { Language } from './types';

/** Legacy stored tag id (search / filters). */
export const EXAM_TAG_LEGACY = 'exam';

export function defaultCaptureTagPreset(language: Language): string {
  return language === 'ko' ? '시험 직전' : 'Before exam';
}

export function normalizeCaptureTagLabel(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, 40);
}

/** Deduped preset list for the save sheet (user-defined tags only). */
export function normalizeCaptureTagPresets(
  presets: string[] | undefined,
  _language?: Language
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (label: string) => {
    const n = normalizeCaptureTagLabel(label);
    if (!n) return;
    // The legacy default "Before exam" tag is no longer offered or stored.
    if (isExamBeforeTag(n)) return;
    const key = n.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(n);
  };
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

export function removeCaptureTagPreset(
  current: string[] | undefined,
  language: Language,
  labelToRemove: string
): string[] {
  const removeKey = normalizeCaptureTagLabel(labelToRemove).toLowerCase();
  if (!removeKey) return normalizeCaptureTagPresets(current, language);
  const without = (current ?? []).filter(
    (p) => normalizeCaptureTagLabel(p).toLowerCase() !== removeKey
  );
  return normalizeCaptureTagPresets(without, language);
}

/** All presets including legacy exam tag can be removed from the app. */
export function canDeleteCaptureTagPreset(_tag: string, _language: Language): boolean {
  return true;
}
