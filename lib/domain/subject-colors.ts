import type { SubjectFolder } from '@/lib/domain/types';
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
  [
    theme.gray,
    theme.graySecondary,
    theme.grayMuted,
    theme.black,
    theme.orange,
    '#ffffff',
    '#ff6b00', // pre-monochrome product accent
  ].map((c) => normalizeSubjectColor(c).toLowerCase())
);

export function isLegacySubjectColor(hex: string | undefined): boolean {
  if (!hex?.trim()) return true;
  return LEGACY_SUBJECT_COLOR_KEYS.has(normalizeSubjectColor(hex).toLowerCase());
}

export function hasExplicitSubjectColor(hex: string | undefined): boolean {
  return Boolean(hex?.trim()) && !isLegacySubjectColor(hex);
}

/** Color shown in UI (settings list, vault name, dashboard card). */
export function resolveSubjectColor(hex: string | undefined, sortOrder = 0): string {
  if (!hasExplicitSubjectColor(hex)) return defaultSubjectColor(sortOrder);
  return normalizeSubjectColor(hex!);
}

/** Persistable colors — backfill missing/legacy hues from the rainbow slot. */
export function normalizeSubjectsColors(subjects: SubjectFolder[]): SubjectFolder[] {
  return subjects.map((s) => ({
    ...s,
    color: hasExplicitSubjectColor(s.color)
      ? normalizeSubjectColor(s.color)
      : defaultSubjectColor(s.sortOrder),
  }));
}

/** After Google sign-in, keep guest-chosen colors when cloud snapshot still has legacy hues. */
export function mergeGuestSubjectColors(
  account: SubjectFolder[],
  guest: SubjectFolder[]
): SubjectFolder[] {
  const guestById = new Map(guest.map((s) => [s.id, s]));
  return account.map((s) => {
    const fromGuest = guestById.get(s.id);
    if (!fromGuest || !hasExplicitSubjectColor(fromGuest.color)) return s;
    if (hasExplicitSubjectColor(s.color)) return s;
    return { ...s, color: normalizeSubjectColor(fromGuest.color) };
  });
}
