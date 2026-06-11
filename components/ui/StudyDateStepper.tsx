import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { enUS, ko } from 'date-fns/locale';
import { useState } from 'react';
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

import { ChevronIcon } from '@/components/ui/ChevronIcon';
import { StudyDatePickSheet } from '@/components/ui/StudyDatePickSheet';
import { WebPressable } from '@/components/ui/WebPressable';
import { theme } from '@/constants/theme';
import { useLanguage } from '@/context/AppContext';
import { shiftStudyDateKey, studyDateBounds, todayKey } from '@/lib/domain/dates';
import { WEB_LINE } from '@/lib/ui/web-divider';

type Props = {
  studyDate: string;
  onChange: (next: string) => void;
  firstLaunchDate: string;
  variant?: 'inline' | 'card';
  style?: StyleProp<ViewStyle>;
  /** Center tap opens a date picker sheet (photo detail). */
  enablePickSheet?: boolean;
};

const STEPPER_DATASET =
  Platform.OS === 'web' ? ({ dataSet: { studyDateStepper: '1' } } as object) : {};

const ARROW_DATASET =
  Platform.OS === 'web' ? ({ dataSet: { studyDateArrow: '1' } } as object) : {};

const PressableBtn = Platform.OS === 'web' ? WebPressable : Pressable;

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
  direction: 'left' | 'right';
  disabled: boolean;
  tintColor: string;
  label: string;
  onPress: () => void;
}) {
  const handlePress = () => {
    if (disabled) return;
    onPress();
  };

  return (
    <PressableBtn
      onPress={handlePress}
      style={[styles.arrowBtn, disabled && styles.arrowDisabled]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={label}
      hitSlop={8}
      pressRetentionOffset={16}
      {...ARROW_DATASET}>
      {Platform.OS === 'web' ? (
        <Text style={[styles.arrowGlyph, { color: tintColor }]}>
          {direction === 'left' ? '‹' : '›'}
        </Text>
      ) : (
        <ChevronIcon direction={direction} size={22} color={tintColor} />
      )}
    </PressableBtn>
  );
}

function CenterDateLabel({
  label,
  variant,
  enablePickSheet,
  pickLabel,
  onOpenPicker,
  onJumpToday,
  showJumpToday,
}: {
  label: string;
  variant: 'inline' | 'card';
  enablePickSheet: boolean;
  pickLabel: string;
  onOpenPicker: () => void;
  onJumpToday: () => void;
  showJumpToday: boolean;
}) {
  const labelStyle = [styles.dateLabel, variant === 'inline' && styles.dateLabelInline];

  if (enablePickSheet) {
    return (
      <PressableBtn
        onPress={onOpenPicker}
        style={styles.centerPress}
        accessibilityRole="button"
        accessibilityLabel={pickLabel}
        hitSlop={4}>
        <Text style={labelStyle} numberOfLines={1}>
          {label}
        </Text>
      </PressableBtn>
    );
  }

  return (
    <>
      <Text style={labelStyle} numberOfLines={1}>
        {label}
      </Text>
      {showJumpToday ? (
        <PressableBtn
          onPress={onJumpToday}
          hitSlop={6}
          style={styles.todayBtn}
          accessibilityRole="button"
          accessibilityLabel={pickLabel}>
          <Text style={styles.todayLink}>{pickLabel}</Text>
        </PressableBtn>
      ) : null}
    </>
  );
}

export function StudyDateStepper({
  studyDate,
  onChange,
  firstLaunchDate,
  variant = 'card',
  style,
  enablePickSheet = false,
}: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [pickerOpen, setPickerOpen] = useState(false);
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
  const jumpTodayLabel = t('capture.dateJumpToday');

  return (
    <>
      <View
        style={[variant === 'card' ? styles.card : styles.inline, style]}
        {...STEPPER_DATASET}>
        <StepperArrow
          direction="left"
          disabled={!canPrev}
          tintColor={canPrev ? theme.black : theme.grayMuted}
          label={t('capture.datePrevDay')}
          onPress={() => step(-1)}
        />

        <View style={styles.center} pointerEvents="box-none">
          <CenterDateLabel
            label={label}
            variant={variant}
            enablePickSheet={enablePickSheet}
            pickLabel={enablePickSheet ? t('capture.pickDateTap') : jumpTodayLabel}
            onOpenPicker={() => setPickerOpen(true)}
            onJumpToday={() => onChange(bounds.max)}
            showJumpToday={!enablePickSheet && !isTodaySelected}
          />
        </View>

        <StepperArrow
          direction="right"
          disabled={!canNext}
          tintColor={canNext ? theme.black : theme.grayMuted}
          label={t('capture.dateNextDay')}
          onPress={() => step(1)}
        />
      </View>

      {enablePickSheet ? (
        <StudyDatePickSheet
          visible={pickerOpen}
          studyDate={studyDate}
          firstLaunchDate={firstLaunchDate}
          onClose={() => setPickerOpen(false)}
          onConfirm={(next) => {
            onChange(next);
            setPickerOpen(false);
          }}
        />
      ) : null}
    </>
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
    zIndex: 2,
  },
  arrowDisabled: { opacity: 0.35 },
  arrowGlyph: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 30,
    textAlign: 'center',
    includeFontPadding: false,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    minWidth: 0,
    zIndex: 0,
  },
  centerPress: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    minHeight: 44,
    maxWidth: '100%',
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
