import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { enUS, ko } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { theme } from '@/constants/theme';
import { useLanguage } from '@/context/AppContext';
import { shiftStudyDateKey, studyDateBounds, todayKey } from '@/lib/domain/dates';

type Props = {
  studyDate: string;
  onChange: (next: string) => void;
  firstLaunchDate: string;
  variant?: 'inline' | 'card';
  style?: StyleProp<ViewStyle>;
};

function formatStepperLabel(
  studyDate: string,
  language: 'ko' | 'en',
  labels: { today: string; yesterday: string }
): string {
  const date = parseISO(`${studyDate}T12:00:00`);
  const locale = language === 'ko' ? ko : enUS;
  if (isToday(date)) return `${labels.today} · ${format(date, 'M/d (EEE)', { locale })}`;
  if (isYesterday(date)) return `${labels.yesterday} · ${format(date, 'M/d (EEE)', { locale })}`;
  if (language === 'ko') {
    return format(date, 'yyyy-MM-dd (EEE)', { locale });
  }
  return format(date, 'MMM d, yyyy (EEE)', { locale });
}

export function StudyDateStepper({
  studyDate,
  onChange,
  firstLaunchDate,
  variant = 'card',
  style,
}: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const bounds = studyDateBounds(firstLaunchDate);
  const canPrev = studyDate > bounds.min;
  const canNext = studyDate < bounds.max;

  const step = (delta: number) => {
    onChange(shiftStudyDateKey(studyDate, delta, bounds));
  };

  const label = formatStepperLabel(studyDate, language, {
    today: t('folder.dateToday'),
    yesterday: t('folder.dateYesterday'),
  });

  const isTodaySelected = studyDate === todayKey();

  return (
    <View style={[variant === 'card' ? styles.card : styles.inline, style]}>
      <Pressable
        onPress={() => step(-1)}
        disabled={!canPrev}
        style={[styles.arrowBtn, !canPrev && styles.arrowDisabled]}
        accessibilityRole="button"
        accessibilityLabel={t('capture.datePrevDay')}>
        <SymbolView
          name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
          size={22}
          tintColor={canPrev ? theme.black : theme.grayMuted}
        />
      </Pressable>

      <View style={styles.center}>
        <Text style={[styles.dateLabel, variant === 'inline' && styles.dateLabelInline]} numberOfLines={1}>
          {label}
        </Text>
        {!isTodaySelected ? (
          <Pressable
            onPress={() => onChange(bounds.max)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={t('capture.dateJumpToday')}>
            <Text style={styles.todayLink}>{t('capture.dateJumpToday')}</Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable
        onPress={() => step(1)}
        disabled={!canNext}
        style={[styles.arrowBtn, !canNext && styles.arrowDisabled]}
        accessibilityRole="button"
        accessibilityLabel={t('capture.dateNextDay')}>
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={22}
          tintColor={canNext ? theme.black : theme.grayMuted}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.grayLight,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  arrowBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
  },
  arrowDisabled: { opacity: 0.35 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    minWidth: 0,
  },
  dateLabel: {
    fontSize: theme.font.heading,
    fontWeight: '800',
    color: theme.black,
    textAlign: 'center',
  },
  dateLabelInline: {
    fontSize: theme.font.body,
    fontWeight: '700',
    color: theme.white,
  },
  todayLink: {
    marginTop: 4,
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.orange,
  },
});
