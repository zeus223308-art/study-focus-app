import { theme } from '@/constants/theme';

/** One display line per sentence (split after . ! ? 。). Safari 15 has no RegExp lookbehind. */
export function splitGuideSentences(text: string): string[] {
  const parts: string[] = [];
  let cursor = 0;
  const re = /[.!?。]\s+/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    parts.push(text.slice(cursor, match.index + match[0].length).trim());
    cursor = match.index + match[0].length;
  }
  const tail = text.slice(cursor).trim();
  if (tail.length > 0) parts.push(tail);
  return parts.filter((part) => part.length > 0);
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
