import { addDays, startOfDay } from 'date-fns';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { todayKey } from '@/lib/domain/dates';

/** Device-local calendar day (yyyy-MM-dd). Updates at local midnight and on app resume. */
export function useLocalCalendarDay(): string {
  const [day, setDay] = useState(todayKey);

  useEffect(() => {
    const sync = () => setDay(todayKey());

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const scheduleNextMidnight = () => {
      const now = new Date();
      const nextMidnight = startOfDay(addDays(now, 1));
      const ms = Math.max(1000, nextMidnight.getTime() - now.getTime() + 250);
      timeoutId = setTimeout(() => {
        sync();
        scheduleNextMidnight();
      }, ms);
    };

    scheduleNextMidnight();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      sub.remove();
    };
  }, []);

  return day;
}
