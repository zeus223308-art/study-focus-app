import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { CloudBackupSettings } from '@/components/settings/CloudBackupSettings';
import { ReviewPatternHelpModal } from '@/components/settings/ReviewPatternHelpModal';
import { SettingsSectionHeader } from '@/components/settings/SettingsSectionHeader';
import { SettingsGroup, SettingsRow } from '@/components/SettingsGroup';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useAppUsageGuide } from '@/context/AppUsageGuideContext';
import { useApp, useLanguage } from '@/context/AppContext';
import {
  folderScheduleLabel,
  toggleFolderScheduleId,
} from '@/lib/domain/folder-schedule';
import type { Language } from '@/lib/domain/types';
import { scheduleDailyReviewReminder, cancelAllReminders } from '@/lib/notifications';
import { isOcrAvailable } from '@/lib/review/ocr-extract';
import { showMessage } from '@/lib/ui/confirm';
import { countAppPages } from '@/services/storage';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
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
  const [patternHelpOpen, setPatternHelpOpen] = useState(false);
  const { openAppUsageGuide } = useAppUsageGuide();
  const { language, setLanguage } = useLanguage();
  const { settings, schedules, subjects } = data;
  const photoCount = countAppPages(data);

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
        t('settings.notificationTitle'),
        t('settings.notificationBody')
      );
    } else {
      cancelAllReminders();
    }
  }, [
    settings.notificationsEnabled,
    settings.notificationHour,
    settings.notificationMinute,
    i18n.language,
    t,
  ]);

  const folderIntervalLabel = (scheduleId: string) =>
    folderScheduleLabel(scheduleId, language, {
      daily: t('schedule.daily'),
      everyTwoDays: t('schedule.everyTwoDays'),
    });

  return (
    <>
      <Screen scroll>
        <ScreenHeader title={t('settings.title')} showSettings={false} />

        <SettingsSectionHeader
          title={t('settings.reviewPattern')}
          onHelpPress={() => setPatternHelpOpen(true)}
          helpAccessibilityLabel={t('settings.reviewPatternHelp')}
        />
        <SettingsGroup>
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
                      {lang === 'ko' ? t('settings.langKo') : t('settings.langEn')}
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
            label={t('settings.limitPhotos')}
            value={t('settings.limitPhotosValue', {
              used: photoCount,
              max: settings.photoLimit,
            })}
            last={false}
          />
          <SettingsRow
            label={t('settings.limitMemos')}
            value={t('settings.limitMemosValue', {
              used: freemium.usedMemos,
              max: settings.memoLimit,
            })}
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
          <SettingsRow label={t('settings.ocr')} value={ocrStatusLabel} last={false} />
          <SettingsRow
            label={t('settings.appUsageGuide')}
            onPress={openAppUsageGuide}
            last
          />
        </SettingsGroup>
      </Screen>

      <ReviewPatternHelpModal
        visible={patternHelpOpen}
        schedules={schedules}
        activeScheduleIds={settings.activeScheduleIds}
        language={language}
        onToggleSchedule={toggleActiveSchedule}
        onAddPattern={() => setPaywallVisible(true)}
        onClose={() => setPatternHelpOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
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
});
