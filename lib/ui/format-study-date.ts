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
