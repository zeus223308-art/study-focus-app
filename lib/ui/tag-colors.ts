/** Color-coded tag chips for album photo tiles. */

/** Single default color for tags with no explicit choice (brand orange). */
export const DEFAULT_TAG_COLOR = '#FF6B00';

/** Free tier: rainbow (빨주노초파남보) to pick the one tag color from. */
export const FREE_TAG_COLORS = [
  '#FF3B30', // 빨 red
  '#FF9500', // 주 orange
  '#FFE600', // 노 yellow
  '#34C759', // 초 green
  '#007AFF', // 파 blue
  '#303F9F', // 남 navy
  '#AF52DE', // 보 violet
];

/** Premium tier: finer shades unlocked with pro. */
export const PREMIUM_TAG_COLORS = [
  '#0891B2', // teal
  '#06B6D4', // cyan
  '#0F766E', // deep teal
  '#65A30D', // olive
  '#84CC16', // lime
  '#D97706', // amber
  '#DB2777', // pink
  '#F43F5E', // rose
  '#92400E', // brown
  '#64748B', // slate
];

/** Full picker list (free first, then premium). */
export const TAG_COLOR_PALETTE = [...FREE_TAG_COLORS, ...PREMIUM_TAG_COLORS];

/** True when a color requires the pro tier. */
export function isPremiumTagColor(color: string): boolean {
  const c = color.toLowerCase();
  return PREMIUM_TAG_COLORS.some((p) => p.toLowerCase() === c);
}

/** The single global tag color when set, otherwise the default color. */
export function resolveTagColor(color?: string): string {
  return color && color.trim() ? color : DEFAULT_TAG_COLOR;
}
