import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SettingsGroup } from '@/components/SettingsGroup';
import { SettingsSectionHeader } from '@/components/settings/SettingsSectionHeader';
import { TagColorModal } from '@/components/tags/TagColorModal';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { normalizeSubjectColor } from '@/lib/domain/subject-colors';

export function SettingsSubjectColorsSection() {
  const { t } = useTranslation();
  const { data, setPaywallVisible, setSubjectColor } = useApp();
  const [colorSubjectId, setColorSubjectId] = useState<string | null>(null);

  const isPro = data.settings.tier === 'pro';
  const subjects = [...data.subjects].sort((a, b) => a.sortOrder - b.sortOrder);
  const activeSubject = subjects.find((s) => s.id === colorSubjectId);

  return (
    <>
      <SettingsSectionHeader title={t('settings.subjectColorsSection')} />
      <SettingsGroup>
        {subjects.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>{t('settings.subjectColorsEmpty')}</Text>
          </View>
        ) : (
          subjects.map((subject, i) => (
            <Pressable
              key={subject.id}
              onPress={() => setColorSubjectId(subject.id)}
              style={[styles.row, i < subjects.length - 1 && styles.rowBorder]}>
              <Text
                style={[
                  styles.label,
                  { color: normalizeSubjectColor(subject.color) },
                ]}
                numberOfLines={1}>
                {subject.name}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))
        )}
      </SettingsGroup>

      <TagColorModal
        visible={colorSubjectId !== null}
        tag={activeSubject?.name ?? ''}
        current={normalizeSubjectColor(activeSubject?.color ?? theme.orange)}
        isPro={isPro}
        title={t('settings.subjectColorPick')}
        freeLabel={t('capture.tagColorsFree')}
        customLabel={t('capture.tagColorCustom')}
        customHint={t('capture.tagColorCustomLocked')}
        applyLabel={t('common.apply')}
        cancelLabel={t('common.cancel')}
        onPick={(color) => {
          if (colorSubjectId) setSubjectColor(colorSubjectId, color);
          setColorSubjectId(null);
        }}
        onRequirePremium={() => {
          setColorSubjectId(null);
          setPaywallVisible(true);
        }}
        onClose={() => setColorSubjectId(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 46,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.grayLight,
  },
  label: {
    flex: 1,
    fontSize: theme.font.body,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 22,
    fontWeight: '300',
    color: theme.grayMuted,
    marginLeft: 8,
  },
  emptyRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: theme.font.bodySmall,
    color: theme.graySecondary,
  },
});
