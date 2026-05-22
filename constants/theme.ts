/** 스케치: 베이지·흑백 + 주황 포인트 ~5% — 가독성 우선 대비 */
export const theme = {
  beige: '#F5F0E8',
  white: '#FFFFFF',
  black: '#0D0D0D',
  blackPure: '#000000',
  /** 본문·라벨 (베이지 위에서도 선명) */
  gray: '#3D3832',
  /** 보조 설명 */
  graySecondary: '#5C554D',
  grayLight: '#E8E2D9',
  grayMuted: '#8A8278',
  accent: '#D14D00',
  accentMuted: 'rgba(209, 77, 0, 0.14)',
  danger: '#B91C1C',
  success: '#1B6B42',
  subject: {
    math: '#D4789A',
    english: '#5A9A5A',
    science: '#5A8FB8',
    korean: '#B8864A',
    default: '#0D0D0D',
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  /** 공통 글자 크기 */
  font: {
    title: 28,
    heading: 22,
    body: 17,
    bodySmall: 15,
    caption: 13,
    label: 12,
  },
};

export const FOLDER_COLORS: Record<string, string> = {
  folder_math: theme.subject.math,
  folder_english: theme.subject.english,
  folder_science: theme.subject.science,
  folder_korean: theme.subject.korean,
};

export function folderColor(folderId: string): string {
  return FOLDER_COLORS[folderId] ?? theme.subject.default;
}
