/** Deterministic, color-coded tag chips for album photo tiles. */

const TAG_PALETTE = [
  '#FF6B00', // orange
  '#E5484D', // red
  '#3E63DD', // blue
  '#30A46C', // green
  '#9333EA', // purple
  '#0891B2', // teal
  '#D97706', // amber
  '#DB2777', // pink
];

/** Stable color for a tag label so the same tag always looks the same. */
export function tagColor(tag: string): string {
  const key = tag.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return TAG_PALETTE[hash % TAG_PALETTE.length]!;
}
