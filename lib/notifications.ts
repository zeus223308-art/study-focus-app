import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { todayKey } from '@/lib/domain/dates';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
const REVIEW_CHANNEL_ID = 'review-reminders';
const WEB_NOTIFY_DATE_KEY = '@memory_sherpa_review_notify_date';

export type ReviewReminderCopy = {
  title: string;
  body: string;
};

if (isNative) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REVIEW_CHANNEL_ID, {
    name: 'Review reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF6B00',
  });
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }
  if (!isNative) return false;
  if (Platform.OS === 'android') {
    await ensureAndroidChannel();
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDailyReviewReminder(
  hour: number,
  minute: number,
  title: string,
  body: string
): Promise<boolean> {
  if (!isNative) return false;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (Platform.OS === 'android') {
    await ensureAndroidChannel();
  }
  const granted = await ensureNotificationPermission();
  if (!granted) return false;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: REVIEW_CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
  return true;
}

export async function cancelAllReminders(): Promise<void> {
  if (isNative) {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
  if (Platform.OS === 'web') {
    try {
      await AsyncStorage.removeItem(WEB_NOTIFY_DATE_KEY);
    } catch {
      /* ignore */
    }
  }
}

/** Native schedule + web in-app reminder tick. Call on app start and when settings change. */
export async function syncReviewReminders(opts: {
  enabled: boolean;
  hour: number;
  minute: number;
  copy: ReviewReminderCopy;
  hasDueReviews: boolean;
}): Promise<boolean> {
  if (!opts.enabled) {
    await cancelAllReminders();
    return false;
  }

  if (isNative) {
    return scheduleDailyReviewReminder(opts.hour, opts.minute, opts.copy.title, opts.copy.body);
  }

  if (Platform.OS === 'web') {
    return ensureNotificationPermission();
  }

  return false;
}

function isPastReminderTime(hour: number, minute: number): boolean {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes() >= hour * 60 + minute;
}

/** Web/mobile browser: show a notification while the app is open (no service worker). */
export async function tickWebReviewReminder(opts: {
  enabled: boolean;
  hour: number;
  minute: number;
  copy: ReviewReminderCopy;
  hasDueReviews: boolean;
}): Promise<void> {
  if (Platform.OS !== 'web' || !opts.enabled || !opts.hasDueReviews) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if (!isPastReminderTime(opts.hour, opts.minute)) return;

  const day = todayKey();
  let lastDay: string | null = null;
  try {
    lastDay = await AsyncStorage.getItem(WEB_NOTIFY_DATE_KEY);
  } catch {
    return;
  }
  if (lastDay === day) return;

  try {
    new Notification(opts.copy.title, { body: opts.copy.body });
    await AsyncStorage.setItem(WEB_NOTIFY_DATE_KEY, day);
  } catch {
    /* ignore — iOS Safari may block without user gesture */
  }
}
