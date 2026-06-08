import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SettingsGroup } from '@/components/SettingsGroup';
import { SettingsSectionHeader } from '@/components/settings/SettingsSectionHeader';
import { TagColorModal } from '@/components/tags/TagColorModal';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { normalizeSubjectColor, resolveSubjectColor } from '@/lib/domain/subject-colors';
import { settingsRowPad, useViewportLayout } from '@/lib/ui/viewport-layout';

export function SettingsSubjectColorsSection() {
  const { t } = useTranslation();
  const { data, setPaywallVisible, setSubjectColor } = useApp();
  const [colorSubjectId, setColorSubjectId] = useState<string | null>(null);

  const viewport = useViewportLayout();
  const rowPad = settingsRowPad(viewport.isPhone);
  const isPro = data.settings.tier === 'pro';
  const subjects = [...data.subjects].sort((a, b) => a.sortOrder - b.sortOrder);
  const activeSubject = subjects.find((s) => s.id === colorSubjectId);

  return (
    <>
      <SettingsSectionHeader title={t('settings.subjectColorsSection')} />
      <SettingsGroup>
        {subjects.length === 0 ? (
          <View style={[styles.emptyRow, { paddingHorizontal: rowPad }]}>
            <Text style={styles.emptyText}>{t('settings.subjectColorsEmpty')}</Text>
          </View>
        ) : (
          subjects.map((subject, i) => (
            <Pressable
              key={subject.id}
              onPress={() => setColorSubjectId(subject.id)}
              style={[
                styles.row,
                { paddingHorizontal: rowPad },
                i < subjects.length - 1 && styles.rowBorder,
              ]}>
              <View style={styles.rowMain}>
                <Text style={styles.label} numberOfLines={1}>
                  {subject.name}
                </Text>
                <View
                  style={[
                    styles.chipSwatch,
                    {
                      borderColor: resolveSubjectColor(subject.color, subject.sortOrder),
                    },
                  ]}
                />
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))
        )}
      </SettingsGroup>

      <TagColorModal
        visible={colorSubjectId !== null}
        tag={activeSubject?.name ?? ''}
        current={resolveSubjectColor(
          activeSubject?.color ?? theme.orange,
          activeSubject?.sortOrder ?? 0
        )}
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
    color: theme.black,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  chipSwatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2.5,
    backgroundColor: theme.surface,
    flexShrink: 0,
  },
  chevron: {
    fontSize: 22,
    fontWeight: '300',
    color: theme.grayMuted,
    marginLeft: 8,
  },
  emptyRow: {
    paddingVertical: 14,
  },
  emptyText: {
    fontSize: theme.font.bodySmall,
    color: theme.graySecondary,
  },
});
