import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useApp } from '@/context/AppContext';
import { syncReviewReminders, tickWebReviewReminder } from '@/lib/notifications';

const WEB_TICK_MS = 60 * 1000;

/** Keeps daily review reminders scheduled (native) and checks while open (web). */
export function ReviewReminderSync() {
  const { ready, data, dueToday } = useApp();
  const { t, i18n } = useTranslation();
  const { settings } = data;
  const hasDueReviews = dueToday.length > 0;

  useEffect(() => {
    if (!ready) return;

    const copy = {
      title: t('settings.notificationTitle'),
      body: t('settings.notificationBody'),
    };

    void syncReviewReminders({
      enabled: settings.notificationsEnabled,
      hour: settings.notificationHour,
      minute: settings.notificationMinute,
      copy,
      hasDueReviews,
    });
  }, [
    ready,
    settings.notificationsEnabled,
    settings.notificationHour,
    settings.notificationMinute,
    i18n.language,
    t,
    hasDueReviews,
  ]);

  useEffect(() => {
    if (!ready || !settings.notificationsEnabled) return;

    const copy = {
      title: t('settings.notificationTitle'),
      body: t('settings.notificationBody'),
    };

    const runTick = () => {
      void tickWebReviewReminder({
        enabled: settings.notificationsEnabled,
        hour: settings.notificationHour,
        minute: settings.notificationMinute,
        copy,
        hasDueReviews,
      });
    };

    runTick();
    const intervalId = setInterval(runTick, WEB_TICK_MS);
    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') runTick();
    };
    const sub = AppState.addEventListener('change', onAppState);

    return () => {
      clearInterval(intervalId);
      sub.remove();
    };
  }, [
    ready,
    settings.notificationsEnabled,
    settings.notificationHour,
    settings.notificationMinute,
    hasDueReviews,
    i18n.language,
    t,
  ]);

  return null;
}
