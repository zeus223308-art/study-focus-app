import { FREE_TAG_COLORS, normalizeTagColorHex } from '@/lib/ui/tag-colors';

/** Default rainbow slot for a new subject (빨주노초파남보). */
export function defaultSubjectColor(sortOrder: number): string {
  return FREE_TAG_COLORS[sortOrder % FREE_TAG_COLORS.length] ?? FREE_TAG_COLORS[0]!;
}

export function normalizeSubjectColor(hex: string): string {
  return normalizeTagColorHex(hex);
}
