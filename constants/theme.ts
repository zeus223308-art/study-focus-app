/** 스케치: 베이지·흑백 + 주황 포인트 ~5% */
export const theme = {
  beige: '#F5F0E8',
  white: '#FFFFFF',
  black: '#1A1A1A',
  blackPure: '#000000',
  gray: '#6B6560',
  grayLight: '#E8E2D9',
  grayMuted: '#B8B0A4',
  accent: '#E85D04',
  accentMuted: 'rgba(232, 93, 4, 0.12)',
  danger: '#C41E1E',
  success: '#2D6A4F',
  /** 과목 달력 점 색 (스케치: 수학 분홍, 영어 초록) */
  subject: {
    math: '#E8A0BF',
    english: '#8FBC8F',
    science: '#9BB8D3',
    korean: '#D4A574',
    default: '#1A1A1A',
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
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
