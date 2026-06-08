import type { Language, NoteBundle } from './types';

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

/** Presets plus every tag on stored photos, deduped and sorted. */
export function collectAllCaptureTags(
  presets: string[] | undefined,
  bundles: NoteBundle[]
): string[] {
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
  for (const p of presets ?? []) push(p);
  for (const bundle of bundles) {
    for (const page of bundle.pages) {
      for (const tag of page.tags ?? []) push(tag);
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

export function captureTagKey(tag: string): string {
  return normalizeCaptureTagLabel(tag).toLowerCase();
}

/** Tags stored on a photo that should appear in UI (no legacy exam tag). */
export function visibleCaptureTags(tags: string[] | undefined): string[] {
  return (tags ?? [])
    .map(normalizeCaptureTagLabel)
    .filter((tag) => tag.length > 0 && !isExamBeforeTag(tag));
}

/** First visible tag on a bundle — matches album thumbnail tag marks. */
export function primaryCaptureTagForBundle(bundle: NoteBundle): string | null {
  for (const page of bundle.pages) {
    const visible = visibleCaptureTags(page.tags);
    if (visible[0]) return visible[0];
  }
  return null;
}

export function captureTagExists(
  tag: string,
  presets: string[] | undefined,
  bundles: NoteBundle[],
  exceptKey?: string
): boolean {
  const key = captureTagKey(tag);
  if (!key) return false;
  const skip = exceptKey?.toLowerCase();
  return collectAllCaptureTags(presets, bundles).some(
    (t) => t.toLowerCase() === key && t.toLowerCase() !== skip
  );
}

export function renameCaptureTagPreset(
  current: string[] | undefined,
  language: Language,
  fromLabel: string,
  toLabel: string
): string[] {
  const fromKey = captureTagKey(fromLabel);
  const toNorm = normalizeCaptureTagLabel(toLabel);
  if (!fromKey || !toNorm) return normalizeCaptureTagPresets(current, language);
  const mapped = (current ?? []).map((p) =>
    captureTagKey(p) === fromKey ? toNorm : p
  );
  return normalizeCaptureTagPresets(mapped, language);
}
