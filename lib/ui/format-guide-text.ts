import { theme } from '@/constants/theme';

/** One display line per sentence (split after . ! ? 。). */
export function splitGuideSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export type GuideFontMetrics = {
  fontSize: number;
  lineHeight: number;
  rowPadding: number;
  sectionSize: number;
};

/** Shrink copy when the guide has many lines so one modal still fits. */
export function guideFontMetrics(lineCount: number): GuideFontMetrics {
  const { font } = theme;
  if (lineCount > 18) {
    return {
      fontSize: font.label,
      lineHeight: 16,
      rowPadding: 8,
      sectionSize: font.caption,
    };
  }
  if (lineCount > 14) {
    return {
      fontSize: font.caption,
      lineHeight: 18,
      rowPadding: 10,
      sectionSize: font.bodySmall,
    };
  }
  if (lineCount > 10) {
    return {
      fontSize: font.bodySmall,
      lineHeight: 20,
      rowPadding: 12,
      sectionSize: font.bodySmall,
    };
  }
  return {
    fontSize: font.body,
    lineHeight: 24,
    rowPadding: 16,
    sectionSize: font.body,
  };
}
