import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useStudy, useStudySettings } from '@/context/StudyContext';
import type { SessionMode } from '@/lib/types';

export function usePomodoro() {
  const settings = useStudySettings();
  const { completeSession } = useStudy();

  const [mode, setMode] = useState<SessionMode>('focus');
  const [focusCount, setFocusCount] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(settings.focusMinutes * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceModeRef = useRef<() => void>(() => {});

  const getDuration = useCallback(
    (m: SessionMode) => {
      if (m === 'focus') return settings.focusMinutes * 60;
      if (m === 'shortBreak') return settings.shortBreakMinutes * 60;
      return settings.longBreakMinutes * 60;
    },
    [settings]
  );

  const resetTimer = useCallback(
    (m: SessionMode) => {
      setMode(m);
      setSecondsLeft(getDuration(m));
      setRunning(false);
    },
    [getDuration]
  );

  const advanceMode = useCallback(() => {
    if (mode === 'focus') {
      const nextCount = focusCount + 1;
      setFocusCount(nextCount);
      completeSession('focus', settings.focusMinutes);
      if (nextCount % settings.sessionsUntilLongBreak === 0) {
        resetTimer('longBreak');
      } else {
        resetTimer('shortBreak');
      }
    } else {
      const breakMinutes =
        mode === 'shortBreak' ? settings.shortBreakMinutes : settings.longBreakMinutes;
      completeSession(mode, breakMinutes);
      resetTimer('focus');
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [mode, focusCount, settings, completeSession, resetTimer]);

  advanceModeRef.current = advanceMode;

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      deactivateKeepAwake();
      return;
    }
    activateKeepAwakeAsync();
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          advanceModeRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      deactivateKeepAwake();
    };
  }, [running]);

  useEffect(() => {
    setSecondsLeft(getDuration(mode));
  }, [settings.focusMinutes, settings.shortBreakMinutes, settings.longBreakMinutes]);

  const toggle = () => setRunning((r) => !r);

  const skip = () => {
    setRunning(false);
    advanceMode();
  };

  const switchMode = (m: SessionMode) => {
    setRunning(false);
    resetTimer(m);
  };

  return {
    mode,
    secondsLeft,
    totalSeconds: getDuration(mode),
    running,
    focusCount,
    toggle,
    skip,
    switchMode,
  };
}
