import type { AppData, AppSettings, Subject } from './types';

export const SUBJECT_COLORS = [
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#F43F5E',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#14B8A6',
  '#0EA5E9',
];

export const DEFAULT_SUBJECTS: Subject[] = [
  { id: 'math', name: '수학', color: '#6366F1' },
  { id: 'english', name: '영어', color: '#0EA5E9' },
  { id: 'science', name: '과학', color: '#22C55E' },
  { id: 'korean', name: '국어', color: '#F43F5E' },
];

export const DEFAULT_SETTINGS: AppSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsUntilLongBreak: 4,
  dailyGoalMinutes: 120,
};

export const DEFAULT_DATA: AppData = {
  subjects: DEFAULT_SUBJECTS,
  sessions: [],
  settings: DEFAULT_SETTINGS,
  lastStudyDate: null,
  streak: 0,
};
