import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { enUS, ko } from 'date-fns/locale';

import type { Language } from '@/lib/domain/types';

export function parseStudyDateKey(studyDate: string): Date {
  return parseISO(`${studyDate}T12:00:00`);
}

export function formatStudyDateHeading(
  studyDate: string,
  language: Language,
  labels: { today: string; yesterday: string }
): string {
  const date = parseStudyDateKey(studyDate);
  const locale = language === 'ko' ? ko : enUS;
  if (isToday(date)) return labels.today;
  if (isYesterday(date)) return labels.yesterday;
  if (language === 'ko') {
    return format(date, 'yyyy년 M월 d일 (EEE)', { locale });
  }
  return format(date, 'EEEE, MMM d, yyyy', { locale });
}

/** Trash restore-by deadline, e.g. "6월 5일 08:00" / "Jun 5, 08:00". */
export function formatTrashDeadline(deadline: Date, language: Language): string {
  const locale = language === 'ko' ? ko : enUS;
  if (language === 'ko') {
    return format(deadline, 'M월 d일 HH:mm', { locale });
  }
  return format(deadline, 'MMM d, HH:mm', { locale });
}

/** Month section heading, e.g. "2024년 2월" / "February 2024". */
export function formatMonthHeading(monthKey: string, language: Language): string {
  const date = parseISO(`${monthKey}-01T12:00:00`);
  const locale = language === 'ko' ? ko : enUS;
  if (language === 'ko') {
    return format(date, 'yyyy년 M월', { locale });
  }
  return format(date, 'MMMM yyyy', { locale });
}
