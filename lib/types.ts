export type SessionMode = 'focus' | 'shortBreak' | 'longBreak';

export type Subject = {
  id: string;
  name: string;
  color: string;
};

export type StudySession = {
  id: string;
  subjectId: string;
  mode: SessionMode;
  durationMinutes: number;
  completedAt: string;
};

export type AppSettings = {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsUntilLongBreak: number;
  dailyGoalMinutes: number;
};

export type AppData = {
  subjects: Subject[];
  sessions: StudySession[];
  settings: AppSettings;
  lastStudyDate: string | null;
  streak: number;
};
