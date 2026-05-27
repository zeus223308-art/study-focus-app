import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { theme } from '@/constants/theme';
import { SCHEDULE_ADD_ID } from '@/lib/domain/folder-schedule';
import type { Language, ReviewSchedule } from '@/lib/domain/types';

type Props = {
  schedules: ReviewSchedule[];
  activeScheduleIds: string[];
  language: Language;
  onToggleSchedule: (id: string) => void;
  onAddPattern: () => void;
};

export function ReviewPatternPickerCard({
  schedules,
  activeScheduleIds,
  language,
  onToggleSchedule,
  onAddPattern,
}: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.group}>
      {schedules.map((s, i) => {
        const isAddRow = s.id === SCHEDULE_ADD_ID;
        const isActive = !isAddRow && activeScheduleIds.includes(s.id);
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
                onAddPattern();
                return;
              }
              onToggleSchedule(s.id);
            }}
            style={[styles.row, i < schedules.length - 1 && styles.rowBorder]}>
            <View style={styles.left}>
              <Text style={styles.num}>{i + 1}</Text>
              <Text style={[styles.name, isAddRow && styles.nameAdd]}>{patternTitle}</Text>
              {isAddRow ? <Text style={styles.premium}>{t('settings.premium')}</Text> : null}
            </View>
            {!isAddRow ? (
              <View style={[styles.check, isActive && styles.checkOn]}>
                {isActive ? (
                  <SymbolView
                    name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                    size={14}
                    tintColor={theme.white}
                  />
                ) : null}
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.grayLight,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.grayLight },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  num: { fontSize: 15, fontWeight: '700', color: theme.orange, width: 20 },
  name: { fontSize: theme.font.body, fontWeight: '700', color: theme.black },
  nameAdd: { color: theme.orange },
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
});
