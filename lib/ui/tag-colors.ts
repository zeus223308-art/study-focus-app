import { captureTagKey } from '@/lib/domain/capture-tags';

/** Color-coded tag chips for album photo tiles. */

/** Single default color for tags with no explicit choice (monochrome white). */
export const DEFAULT_TAG_COLOR = '#FFFFFF';

/** Old app-wide accent before per-tag colors. */
const LEGACY_PRODUCT_ORANGE = '#ff6b00';

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

/** Normalized lookup key for per-tag color maps (matches stored photo tags). */
export function tagColorKey(tag: string): string {
  return captureTagKey(tag);
}

/** Map legacy / mistaken stored hues to the free rainbow palette. */
export function canonicalizeTagColor(hex: string): string {
  const key = normalizeHex(hex);
  if (!key) return DEFAULT_TAG_COLOR;
  if (key === LEGACY_PRODUCT_ORANGE) return '#f39211';
  return key;
}

/**
 * Assign each active tag a stable free-palette color when missing.
 * Drops colors for tags that no longer exist on any photo or preset.
 */
export function ensureTagColorMap(
  tags: string[],
  existing?: Record<string, string>
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [rawKey, rawColor] of Object.entries(existing ?? {})) {
    const key = rawKey.trim().toLowerCase();
    if (!key || !rawColor?.trim()) continue;
    map[key] = canonicalizeTagColor(normalizeTagColorHex(rawColor));
  }

  const sorted = [...tags].sort((a, b) => a.localeCompare(b));
  const activeKeys = new Set<string>();
  let assignIdx = 0;
  for (const tag of sorted) {
    const key = captureTagKey(tag);
    if (!key) continue;
    activeKeys.add(key);
    if (map[key]?.trim()) continue;
    map[key] = FREE_TAG_COLORS[assignIdx % FREE_TAG_COLORS.length]!;
    assignIdx += 1;
  }

  for (const key of Object.keys(map)) {
    if (!activeKeys.has(key)) delete map[key];
  }
  return map;
}

/**
 * Color for a specific tag: its own saved color, else white.
 * Legacy global `tagColor` is ignored so stale browns/oranges do not leak.
 */
export function resolveTagColorFor(
  tag: string,
  tagColors?: Record<string, string>,
  _fallback?: string
): string {
  const own = tagColors?.[tagColorKey(tag)];
  if (own && own.trim()) return canonicalizeTagColor(normalizeTagColorHex(own));
  return DEFAULT_TAG_COLOR;
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

/** Snap to the nearest free rainbow swatch (빨주노초파남보) for label contrast rules. */
export function snapToFreeTagPalette(hex: string): string {
  const rgb = parseHexRgb(hex);
  if (!rgb) return FREE_TAG_COLORS[0]!;
  let best = FREE_TAG_COLORS[0]!;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const candidate of FREE_TAG_COLORS) {
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

/** Ribbon / chip label tone from the free rainbow slot (빨주노초 vs 파남보). */
export type TagRibbonLabelTone = 'dark' | 'light';

/**
 * Photo tag ribbon: 빨·주·노·초 → dark, 파·남·보 → light.
 * Always maps the ribbon fill to the nearest free swatch first.
 */
export function tagRibbonLabelTone(backgroundHex: string): TagRibbonLabelTone {
  const key = normalizeHex(backgroundHex);
  const freeKey =
    key && FREE_TAG_COLORS.some((c) => normalizeHex(c) === key)
      ? key
      : normalizeHex(snapToFreeTagPalette(backgroundHex));
  if (!freeKey) return 'dark';
  const freeIdx = FREE_TAG_COLORS.findIndex((c) => normalizeHex(c) === freeKey);
  if (freeIdx >= 4 && freeIdx <= 6) return 'light';
  return 'dark';
}

/**
 * Photo tag ribbon label: 빨·주·노·초 → black, 파·남·보 → white.
 * Premium / legacy hex uses premium sets when exact; otherwise nearest free rainbow slot.
 */
export function tagLabelTextColor(backgroundHex: string): string {
  const key = normalizeHex(backgroundHex);
  if (key && isKnownPaletteKey(key)) {
    return tagLabelTextColorForPaletteKey(key);
  }
  return tagRibbonLabelTone(backgroundHex) === 'light' ? TAG_TEXT_LIGHT : TAG_TEXT_DARK;
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
