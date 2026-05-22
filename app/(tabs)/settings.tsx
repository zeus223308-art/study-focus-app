import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useApp, useLanguage } from '@/context/AppContext';
import { scheduleDailyReviewReminder, cancelAllReminders } from '@/lib/notifications';
import type { Language } from '@/lib/types';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { data, updateSettings, photoCount } = useApp();
  const { language, setLanguage } = useLanguage();
  const { settings, schedules } = data;

  useEffect(() => {
    if (settings.notificationsEnabled) {
      scheduleDailyReviewReminder(
        settings.notificationHour,
        settings.notificationMinute,
        t('dashboard.studyPlease'),
        t('dashboard.title')
      );
    } else {
      cancelAllReminders();
    }
  }, [settings.notificationsEnabled, settings.notificationHour, settings.notificationMinute, i18n.language]);

  return (
    <Screen scroll>
      <Text style={styles.title}>{t('settings.title')}</Text>

      <View style={styles.block}>
        <Text style={styles.label}>{t('settings.language')}</Text>
        <View style={styles.langRow}>
          {(['ko', 'en'] as Language[]).map((lang) => (
            <Pressable
              key={lang}
              onPress={() => setLanguage(lang)}
              style={[styles.langBtn, language === lang && styles.langBtnOn]}>
              <Text style={language === lang ? styles.langOn : styles.langText}>
                {lang === 'ko' ? '한국어' : 'English'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.block}>
        <View style={styles.row}>
          <Text style={styles.label}>{t('settings.notifications')}</Text>
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={(v) => updateSettings({ notificationsEnabled: v })}
            trackColor={{ true: theme.accent }}
          />
        </View>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>{t('settings.schedules')}</Text>
        {schedules.map((s) => (
          <Text key={s.id} style={styles.scheduleItem}>
            · {s.name}
            {s.mode === 'everyNDays' ? ` (${s.everyNDays}일)` : ` [${s.customIntervals?.join(',')}]`}
          </Text>
        ))}
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>{t('settings.limits')}</Text>
        <Text style={styles.meta}>
          {t('settings.photos', { used: photoCount, max: settings.photoLimit })}
        </Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>{t('settings.cloud')}</Text>
        <Text style={styles.meta}>{t('settings.cloudSoon')}</Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>{t('settings.ocr')}</Text>
        <Text style={styles.meta}>{t('settings.ocrSoon')}</Text>
      </View>

      <Pressable onPress={() => router.push('/onboarding')} style={styles.link}>
        <Text style={styles.linkText}>{t('settings.onboarding')}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700', color: theme.black, marginBottom: 20 },
  block: {
    backgroundColor: theme.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.grayLight,
  },
  label: { fontSize: 15, fontWeight: '700', color: theme.black, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  langRow: { flexDirection: 'row', gap: 8 },
  langBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.grayLight,
  },
  langBtnOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  langText: { color: theme.black },
  langOn: { color: theme.white, fontWeight: '600' },
  scheduleItem: { fontSize: 14, color: theme.gray, marginTop: 4 },
  meta: { fontSize: 14, color: theme.gray, lineHeight: 22 },
  link: { marginTop: 8, padding: 12 },
  linkText: { color: theme.accent, fontWeight: '600' },
});
