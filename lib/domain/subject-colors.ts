import { theme } from '@/constants/theme';
import { FREE_TAG_COLORS, normalizeTagColorHex } from '@/lib/ui/tag-colors';

/** Default rainbow slot for a new subject (빨주노초파남보). */
export function defaultSubjectColor(sortOrder: number): string {
  return FREE_TAG_COLORS[sortOrder % FREE_TAG_COLORS.length] ?? FREE_TAG_COLORS[0]!;
}

export function normalizeSubjectColor(hex: string): string {
  return normalizeTagColorHex(hex);
}

/** Legacy installs stored theme grays — map to rainbow for display until user picks in Settings. */
const LEGACY_SUBJECT_COLOR_KEYS = new Set(
  [theme.gray, theme.graySecondary, theme.grayMuted, theme.black, '#ffffff'].map((c) =>
    normalizeSubjectColor(c).toLowerCase()
  )
);

export function isLegacySubjectColor(hex: string): boolean {
  return LEGACY_SUBJECT_COLOR_KEYS.has(normalizeSubjectColor(hex).toLowerCase());
}

/** Color shown in UI (settings list, vault name, dashboard card). */
export function resolveSubjectColor(hex: string, sortOrder = 0): string {
  if (isLegacySubjectColor(hex)) return defaultSubjectColor(sortOrder);
  return normalizeSubjectColor(hex);
}
