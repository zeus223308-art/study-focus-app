/** Color-coded tag chips for album photo tiles. */

/** Single default color for tags with no explicit choice (monochrome white). */
export const DEFAULT_TAG_COLOR = '#FFFFFF';

/** Free tier: rainbow (빨주노초파남보) to pick the one tag color from. */
export const FREE_TAG_COLORS = [
  '#E91818', // 빨 red
  '#F39211', // 주 orange
  '#F8E208', // 노 yellow
  '#177F19', // 초 green
  '#0D3BE9', // 파 blue
  '#3A1B8B', // 남 indigo
  '#7E1091', // 보 violet
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

/** Normalized lookup key for per-tag color maps. */
export function tagColorKey(tag: string): string {
  return tag.trim().toLowerCase();
}

/**
 * Color for a specific tag: its own color if set, else the legacy global
 * `tagColor`, else the default. Keeps existing tags stable when a new tag's
 * color is changed.
 */
export function resolveTagColorFor(
  tag: string,
  tagColors?: Record<string, string>,
  fallback?: string
): string {
  const own = tagColors?.[tagColorKey(tag)];
  if (own && own.trim()) return own;
  return resolveTagColor(fallback);
}

const TAG_TEXT_DARK = '#141414';
const TAG_TEXT_LIGHT = '#FFFFFF';

function parseHexRgb(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.trim().replace(/^#/, '');
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((x) => x + x)
          .join('')
      : raw.length >= 6
        ? raw.slice(0, 6)
        : '';
  if (full.length !== 6) return null;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return null;
  return { r, g, b };
}

function srgbChannelToLinear(channel: number): number {
  const s = channel / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const rgb = parseHexRgb(hex);
  if (!rgb) return 0;
  const r = srgbChannelToLinear(rgb.r);
  const g = srgbChannelToLinear(rgb.g);
  const b = srgbChannelToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Readable text on a tag ribbon / chip — picks dark or light by WCAG contrast. */
export function contrastTextColor(hex: string): string {
  const bg = relativeLuminance(hex);
  const darkLum = relativeLuminance(TAG_TEXT_DARK);
  const lightLum = relativeLuminance(TAG_TEXT_LIGHT);
  return contrastRatio(bg, darkLum) >= contrastRatio(bg, lightLum)
    ? TAG_TEXT_DARK
    : TAG_TEXT_LIGHT;
}

/** Subtle shadow so tag labels stay legible on busy photo areas. */
export function contrastTextShadow(hex: string): {
  textShadowColor: string;
  textShadowOffset: { width: number; height: number };
  textShadowRadius: number;
} {
  const light = contrastTextColor(hex) === TAG_TEXT_LIGHT;
  return {
    textShadowColor: light ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 1.25,
  };
}
