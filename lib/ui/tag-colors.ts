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
  if (own && own.trim()) return normalizeTagColorHex(own);
  return normalizeTagColorHex(resolveTagColor(fallback));
}

const TAG_TEXT_DARK = '#141414';
const TAG_TEXT_LIGHT = '#FFFFFF';

/** Premium warm/bright hues — same rule as 빨·주·노·초 family. */
const PREMIUM_DARK_TEXT = new Set(
  ['#65a30d', '#84cc16', '#d97706', '#db2777', '#f43f5e']
);

/** Premium cool/deep hues — same rule as 파·남·보 family. */
const PREMIUM_LIGHT_TEXT = new Set(
  ['#0891b2', '#06b6d4', '#0f766e', '#92400e', '#64748b']
);

/** Legacy global tag tint (pre–per-tag colors). */
const LEGACY_TAG_ORANGE = '#ff6b00';

/** Canonical `#rrggbb` for storage and lookups. */
export function normalizeTagColorHex(hex: string): string {
  return normalizeHex(hex) ?? DEFAULT_TAG_COLOR;
}

function normalizeHex(hex: string): string | null {
  const rgb = parseHexRgb(hex);
  if (!rgb) return null;
  const to2 = (n: number) => n.toString(16).padStart(2, '0');
  return `#${to2(rgb.r)}${to2(rgb.g)}${to2(rgb.b)}`.toLowerCase();
}

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

function rgbSaturation(rgb: { r: number; g: number; b: number }): number {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max <= 0) return 0;
  return (max - min) / max;
}

/** Hue 0–360; achromatic colors return 0. */
function rgbHueDegrees(rgb: { r: number; g: number; b: number }): number {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta < 1 / 255) return 0;
  let h = 0;
  if (max === r) h = ((g - b) / delta) % 6;
  else if (max === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;
  h *= 60;
  if (h < 0) h += 360;
  return h;
}

/** 빨·주·노·초 (+ legacy orange, pink-red). */
function isWarmTagHue(hue: number): boolean {
  return hue <= 150 || hue >= 325;
}

/** Snap any stored hex to the nearest tag palette swatch. */
export function snapToTagPalette(hex: string): string {
  const rgb = parseHexRgb(hex);
  if (!rgb) return DEFAULT_TAG_COLOR;
  let best = TAG_COLOR_PALETTE[0]!;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const candidate of TAG_COLOR_PALETTE) {
    const c = parseHexRgb(candidate);
    if (!c) continue;
    const d = (rgb.r - c.r) ** 2 + (rgb.g - c.g) ** 2 + (rgb.b - c.b) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = candidate;
    }
  }
  return best;
}

function tagLabelTextColorForPaletteKey(key: string): string {
  const freeIdx = FREE_TAG_COLORS.findIndex((c) => normalizeHex(c) === key);
  if (freeIdx >= 0 && freeIdx <= 3) return TAG_TEXT_DARK;
  if (freeIdx >= 4 && freeIdx <= 6) return TAG_TEXT_LIGHT;
  if (
    PREMIUM_DARK_TEXT.has(key) ||
    key === LEGACY_TAG_ORANGE
  ) {
    return TAG_TEXT_DARK;
  }
  if (PREMIUM_LIGHT_TEXT.has(key)) return TAG_TEXT_LIGHT;
  return TAG_TEXT_DARK;
}

function isKnownPaletteKey(key: string): boolean {
  if (FREE_TAG_COLORS.some((c) => normalizeHex(c) === key)) return true;
  if (PREMIUM_DARK_TEXT.has(key) || PREMIUM_LIGHT_TEXT.has(key)) return true;
  if (key === LEGACY_TAG_ORANGE) return true;
  return false;
}

/**
 * Photo tag ribbon label: 빨·주·노·초 → black, 파·남·보 → white.
 * Uses the stored swatch when it matches the palette; otherwise snaps for legacy hex.
 */
export function tagLabelTextColor(backgroundHex: string): string {
  const key = normalizeHex(backgroundHex);
  if (key && isKnownPaletteKey(key)) return tagLabelTextColorForPaletteKey(key);

  const snappedKey = normalizeHex(snapToTagPalette(backgroundHex));
  if (snappedKey) return tagLabelTextColorForPaletteKey(snappedKey);

  const rgb = parseHexRgb(backgroundHex);
  if (!rgb) return TAG_TEXT_LIGHT;

  const lum = relativeLuminance(backgroundHex);
  if (lum > 0.78) return TAG_TEXT_DARK;
  if (lum < 0.1) return TAG_TEXT_LIGHT;

  const sat = rgbSaturation(rgb);
  if (sat < 0.12) return lum > 0.45 ? TAG_TEXT_DARK : TAG_TEXT_LIGHT;

  return isWarmTagHue(rgbHueDegrees(rgb)) ? TAG_TEXT_DARK : TAG_TEXT_LIGHT;
}

/** @deprecated Use tagLabelTextColor — kept for TagFilterBar and imports. */
export function contrastTextColor(hex: string): string {
  return tagLabelTextColor(hex);
}

/** Subtle shadow so tag labels stay legible on busy photo areas. */
export function contrastTextShadow(hex: string): {
  textShadowColor: string;
  textShadowOffset: { width: number; height: number };
  textShadowRadius: number;
} {
  const light = tagLabelTextColor(hex) === TAG_TEXT_LIGHT;
  return {
    textShadowColor: light ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 1.25,
  };
}
