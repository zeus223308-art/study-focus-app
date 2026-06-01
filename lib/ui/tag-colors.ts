/** Color-coded tag chips for album photo tiles. */

/** Selectable palette shown in the tag color picker. */
export const TAG_COLOR_PALETTE = [
  '#FF6B00', // orange
  '#E5484D', // red
  '#3E63DD', // blue
  '#30A46C', // green
  '#9333EA', // purple
  '#0891B2', // teal
  '#D97706', // amber
  '#DB2777', // pink
  '#0F172A', // slate
  '#65A30D', // lime
];

/** Stable fallback color for a tag with no explicit choice. */
export function tagColor(tag: string): string {
  const key = tag.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return TAG_COLOR_PALETTE[hash % TAG_COLOR_PALETTE.length]!;
}

/** Explicit user-chosen color when set, otherwise the stable fallback. */
export function resolveTagColor(
  tag: string,
  colorMap?: Record<string, string>
): string {
  const key = tag.trim().toLowerCase();
  const chosen = colorMap?.[key];
  return chosen ?? tagColor(tag);
}
