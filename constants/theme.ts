/** Grey dark mode — orange accent, high-contrast text */
export const theme = {
  /** App shell background */
  beige: '#141414',
  /** Cards, sheets, inputs */
  surface: '#262626',
  /** Drawing / recall areas (slightly raised) */
  paper: '#2E2E2E',
  /** Literal white — text/icons on orange or photos */
  white: '#FFFFFF',
  /** Primary text */
  black: '#F0EDE8',
  /** Full-screen camera / pure black overlays */
  blackPure: '#000000',
  gray: '#C8C2BA',
  graySecondary: '#A8A29E',
  /** Borders, inactive dots, dividers */
  grayLight: '#3D3A36',
  dock: '#1C1C1C',
  dockDivider: 'rgba(255, 255, 255, 0.12)',
  grayMuted: '#8A8480',
  orange: '#FF6B00',
  orangeMuted: 'rgba(255, 107, 0, 0.22)',
  orangeSoft: 'rgba(255, 107, 0, 0.14)',
  danger: '#F87171',
  success: '#4ADE80',
  inkDefault: '#F0EDE8',
  ribbon: {
    overdue: '#F87171',
    complete: '#E8E6E3',
    upcoming: '#8A8480',
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
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  limits: {
    freeImages: 300,
    freeMemos: 100,
  },
};

export const FOLDER_COLORS: Record<string, string> = {
  folder_math: '#C8C2BA',
  folder_english: '#A8A29E',
  folder_science: '#9A948C',
  folder_korean: '#E8E6E3',
  folder_history: '#B0AAA0',
};

export function folderColor(folderId: string): string {
  return FOLDER_COLORS[folderId] ?? theme.gray;
}
