import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { enUS, ko } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { theme } from '@/constants/theme';
import { useLanguage } from '@/context/AppContext';
import { shiftStudyDateKey, studyDateBounds, todayKey } from '@/lib/domain/dates';
import { WEB_LINE } from '@/lib/ui/web-divider';
import { WebTapButton } from '@/lib/ui/WebTapButton';

type Props = {
  studyDate: string;
  onChange: (next: string) => void;
  firstLaunchDate: string;
  variant?: 'inline' | 'card';
  style?: StyleProp<ViewStyle>;
};

const STEPPER_DATASET =
  Platform.OS === 'web' ? ({ dataSet: { studyDateStepper: '1' } } as object) : {};

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

function StepperArrow({
  direction,
  disabled,
  tintColor,
  label,
  onPress,
}: {
  direction: 'prev' | 'next';
  disabled: boolean;
  tintColor: string;
  label: string;
  onPress: () => void;
}) {
  const glyph = direction === 'prev' ? '‹' : '›';

  if (Platform.OS === 'web') {
    return (
      <WebTapButton
        onPress={onPress}
        disabled={disabled}
        label={label}
        style={styles.arrowBtn}>
        <Text style={[styles.arrowGlyph, { color: tintColor }]} selectable={false}>
          {glyph}
        </Text>
      </WebTapButton>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.arrowBtn, disabled && styles.arrowDisabled]}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <SymbolView
        name={
          direction === 'prev'
            ? { ios: 'chevron.left', android: 'chevron_left', web: 'arrow_back' }
            : { ios: 'chevron.right', android: 'chevron_right', web: 'arrow_forward' }
        }
        size={22}
        tintColor={tintColor}
      />
    </Pressable>
  );
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
    const next = shiftStudyDateKey(studyDate, delta, bounds);
    if (next !== studyDate) onChange(next);
  };

  const label = formatStepperLabel(studyDate, language, {
    today: t('folder.dateToday'),
    yesterday: t('folder.dateYesterday'),
  });

  const isTodaySelected = studyDate === todayKey();

  return (
    <View
      style={[variant === 'card' ? styles.card : styles.inline, style]}
      {...STEPPER_DATASET}>
      <StepperArrow
        direction="prev"
        disabled={!canPrev}
        tintColor={canPrev ? theme.black : theme.grayMuted}
        label={t('capture.datePrevDay')}
        onPress={() => step(-1)}
      />

      <View style={styles.center}>
        <Text style={[styles.dateLabel, variant === 'inline' && styles.dateLabelInline]} numberOfLines={1}>
          {label}
        </Text>
        {!isTodaySelected ? (
          Platform.OS === 'web' ? (
            <WebTapButton
              onPress={() => onChange(bounds.max)}
              label={t('capture.dateJumpToday')}
              style={styles.todayBtn}>
              <Text style={styles.todayLink}>{t('capture.dateJumpToday')}</Text>
            </WebTapButton>
          ) : (
            <Pressable
              onPress={() => onChange(bounds.max)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={t('capture.dateJumpToday')}>
              <Text style={styles.todayLink}>{t('capture.dateJumpToday')}</Text>
            </Pressable>
          )
        ) : null}
      </View>

      <StepperArrow
        direction="next"
        disabled={!canNext}
        tintColor={canNext ? theme.black : theme.grayMuted}
        label={t('capture.dateNextDay')}
        onPress={() => step(1)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderWidth: WEB_LINE,
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
    flexShrink: 0,
  },
  arrowGlyph: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
    textAlign: 'center',
    includeFontPadding: false,
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
  todayBtn: {
    marginTop: 4,
    minHeight: 28,
    alignSelf: 'center',
  },
  todayLink: {
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.orange,
  },
});
