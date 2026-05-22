import type { NoteBundle } from './types';

/** User-facing title above the study date (empty if unset or same as date). */
export function bundleDisplayTitle(bundle: NoteBundle): string | null {
  const trimmed = bundle.title.trim();
  if (!trimmed || trimmed === bundle.studyDate) return null;
  return trimmed;
}
