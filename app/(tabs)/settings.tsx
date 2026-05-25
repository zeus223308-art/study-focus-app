import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { CloudBackupSettings } from '@/components/settings/CloudBackupSettings';
import { SettingsGroup, SettingsRow } from '@/components/SettingsGroup';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useApp, useLanguage } from '@/context/AppContext';
import {
  SCHEDULE_ADD_ID,
  folderScheduleLabel,
  toggleFolderScheduleId,
} from '@/lib/domain/folder-schedule';
import type { Language } from '@/lib/domain/types';
import { scheduleDailyReviewReminder, cancelAllReminders } from '@/lib/notifications';
import { isOcrAvailable } from '@/lib/review/ocr-extract';
import { showMessage } from '@/lib/ui/confirm';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const {
    data,
    updateSettings,
    toggleActiveSchedule,
    setSubjectSchedule,
    setPaywallVisible,
    freemium,
    upgradePhotoQuality,
  } = useApp();
  const [photoUpgradeBusy, setPhotoUpgradeBusy] = useState(false);
  const { language, setLanguage } = useLanguage();
  const { settings, schedules, subjects } = data;
  const active = settings.activeScheduleIds;
  const photoCount = freemium.usedImages;

  const ocrStatusLabel =
    Platform.OS === 'web'
      ? t('settings.ocrWebOnly')
      : isOcrAvailable()
        ? t('settings.ocrOnDevice')
        : t('settings.ocrUnsupported');

  useEffect(() => {
    if (settings.notificationsEnabled) {
      scheduleDailyReviewReminder(
        settings.notificationHour,
        settings.notificationMinute,
        "You have Today's Reviews waiting.",
        "Today's review"
      );
    } else {
      cancelAllReminders();
    }
  }, [settings.notificationsEnabled, settings.notificationHour, i18n.language]);

  const folderIntervalLabel = (scheduleId: string) =>
    folderScheduleLabel(scheduleId, language, {
      daily: t('schedule.daily'),
      everyTwoDays: t('schedule.everyTwoDays'),
    });

  return (
    <Screen scroll>
      <ScreenHeader title={t('settings.title')} showSettings={false} />

      <Text style={styles.sectionTitle}>{t('settings.reviewPattern')}</Text>
      <View style={styles.patternGroup}>
        {schedules.map((s, i) => {
          const isAddRow = s.id === SCHEDULE_ADD_ID;
          const isActive = !isAddRow && active.includes(s.id);
          const patternTitle = isAddRow
            ? t('settings.addPattern')
            : language === 'ko'
              ? s.name
              : s.nameEn;
          return (
            <Pressable
              key={s.id}
              onPress={() => {
                if (isAddRow) {
                  setPaywallVisible(true);
                  return;
                }
                toggleActiveSchedule(s.id);
              }}
              style={[styles.patternRow, i < schedules.length - 1 && styles.patternBorder]}>
              <View style={styles.patternLeft}>
                <Text style={styles.patternNum}>{i + 1}</Text>
                <Text style={[styles.patternName, isAddRow && styles.patternAdd]}>{patternTitle}</Text>
                {isAddRow && <Text style={styles.premium}>{t('settings.premium')}</Text>}
              </View>
              {!isAddRow && (
                <View style={[styles.check, isActive && styles.checkOn]}>
                  {isActive && <Text style={styles.checkMark}>?</Text>}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <SettingsGroup title={t('settings.filesSection')}>
        {subjects.map((f, i) => (
          <SettingsRow
            key={f.id}
            label={f.name}
            value={folderIntervalLabel(f.reviewScheduleId)}
            onPress={() => setSubjectSchedule(f.id, toggleFolderScheduleId(f.reviewScheduleId))}
            last={i === subjects.length - 1}
          />
        ))}
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow
          label={t('settings.language')}
          right={
            <View style={styles.langRow}>
              {(['ko', 'en'] as Language[]).map((lang) => (
                <Pressable
                  key={lang}
                  onPress={() => setLanguage(lang)}
                  style={[styles.langChip, language === lang && styles.langChipOn]}>
                  <Text style={language === lang ? styles.langOn : styles.langText}>
                    {lang === 'ko' ? '???' : 'EN'}
                  </Text>
                </Pressable>
              ))}
            </View>
          }
          last={false}
        />
        <View style={[styles.row, styles.rowBorder]}>
          <Text style={styles.label}>{t('settings.notifications')}</Text>
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={(v) => updateSettings({ notificationsEnabled: v })}
            trackColor={{ true: theme.orange }}
          />
        </View>
        <SettingsRow
          label={t('settings.limits')}
          value={`${photoCount} / ${settings.photoLimit} ? ${freemium.usedMemos} / ${settings.memoLimit}`}
          last
        />
      </SettingsGroup>

      <SettingsGroup title={t('settings.cloudSection')}>
        <CloudBackupSettings />
        <SettingsRow
          label={t('settings.upgradePhotoQuality')}
          value={photoUpgradeBusy ? t('settings.upgradePhotoQualityBusy') : t('settings.upgradePhotoQualityHint')}
          onPress={() => {
            if (photoUpgradeBusy || photoCount === 0) return;
            Alert.alert(t('settings.upgradePhotoQualityTitle'), t('settings.upgradePhotoQualityMessage'), [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('settings.upgradePhotoQualityRun'),
                onPress: async () => {
                  setPhotoUpgradeBusy(true);
                  try {
                    const { upgraded, unchanged } = await upgradePhotoQuality(true);
                    showMessage(
                      t('settings.upgradePhotoQualityDone', { upgraded, unchanged })
                    );
                  } finally {
                    setPhotoUpgradeBusy(false);
                  }
                },
              },
            ]);
          }}
          last
        />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow label={t('settings.ocr')} value={ocrStatusLabel} last />
      </SettingsGroup>

      <Pressable onPress={() => router.push('/onboarding')} style={styles.link}>
        <Text style={styles.linkText}>{t('settings.onboarding')}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: theme.font.label,
    fontWeight: '700',
    color: theme.graySecondary,
    marginBottom: 4,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hint: { fontSize: theme.font.caption, fontWeight: '600', color: theme.gray, marginBottom: 8, marginLeft: 4 },
  patternGroup: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.grayLight,
    marginBottom: 24,
    overflow: 'hidden',
  },
  patternRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  patternBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.grayLight },
  patternLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  patternNum: { fontSize: 15, fontWeight: '700', color: theme.orange, width: 20 },
  patternName: { fontSize: theme.font.body, fontWeight: '700', color: theme.black },
  patternAdd: { color: theme.orange },
  premium: { fontSize: theme.font.label, color: theme.orange, fontWeight: '700' },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: theme.orange, borderColor: theme.orange },
  checkMark: { color: theme.white, fontSize: 12, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.grayLight },
  label: { fontSize: theme.font.body, fontWeight: '600', color: theme.black },
  langRow: { flexDirection: 'row', gap: 6 },
  langChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: theme.grayLight },
  langChipOn: { backgroundColor: theme.orange, borderColor: theme.orange },
  langText: { fontSize: 13, color: theme.black },
  langOn: { fontSize: 13, color: theme.white, fontWeight: '600' },
  link: { padding: 16 },
  linkText: { color: theme.orange, fontWeight: '600', textAlign: 'center' },
});
