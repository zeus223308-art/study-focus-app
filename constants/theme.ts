/** Premium Minimal Orange-Point — 5% orange, beige base */
export const theme = {
  beige: '#F9F8F6',
  white: '#FFFFFF',
  black: '#0D0D0D',
  blackPure: '#000000',
  gray: '#3D3832',
  graySecondary: '#5C554D',
  grayLight: '#E8E4DE',
  /** Top dock bar — soft gray tint */
  dock: '#D8D5D0',
  dockDivider: 'rgba(61, 56, 50, 0.14)',
  grayMuted: '#9A948C',
  /** 5% rule — active only */
  orange: '#FF6B00',
  orangeMuted: 'rgba(255, 107, 0, 0.12)',
  orangeSoft: 'rgba(255, 107, 0, 0.08)',
  danger: '#DC2626',
  success: '#16A34A',
  ribbon: {
    overdue: '#DC2626',
    complete: '#0D0D0D',
    upcoming: '#9A948C',
  },
  radius: {
    sm: 16,
    md: 24,
    lg: 32,
    pill: 999,
  },
  font: {
    title: 28,
    heading: 22,
    body: 17,
    bodySmall: 15,
    caption: 13,
    label: 11,
  },
  spring: {
    damping: 18,
    stiffness: 220,
    mass: 0.8,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  limits: {
    freeImages: 300,
    freeMemos: 100,
  },
};

export const FOLDER_COLORS: Record<string, string> = {
  folder_math: '#3D3832',
  folder_english: '#5C554D',
  folder_science: '#6B6560',
  folder_korean: '#4A4540',
  folder_history: '#7A746C',
};

export function folderColor(folderId: string): string {
  return FOLDER_COLORS[folderId] ?? theme.gray;
}
