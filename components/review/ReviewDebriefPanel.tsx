import { useTranslation } from 'react-i18next';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { RecallWorkCard, type ScratchTextBox } from '@/components/review/RecallWorkCard';
import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import { webHairlineTop } from '@/lib/ui/web-divider';
import type { InkStroke } from '@/lib/domain/types';

type Props = {
  frontUri: string | null;
  answerUri: string | null;
  hasAnswer: boolean;
  cardWidth: number;
  problemHeight: number;
  workHeight: number;
  strokes: InkStroke[];
  textBoxes: ScratchTextBox[];
  bottomInset: number;
  onNext: () => void;
  nextLabel: string;
};

export function ReviewDebriefPanel({
  frontUri,
  answerUri,
  hasAnswer,
  cardWidth,
  problemHeight,
  workHeight,
  strokes,
  textBoxes,
  bottomInset,
  onNext,
  nextLabel,
}: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomInset + 88 },
        ]}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled">
        <View style={[styles.photoFrame, { width: cardWidth, height: problemHeight }]}>
          {frontUri ? (
            <Image
              source={{ uri: frontUri }}
              style={{ width: cardWidth, height: problemHeight }}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.photoMissing, { width: cardWidth, height: problemHeight }]} />
          )}
        </View>

        <Text style={styles.sectionLabel}>{t('review.debriefYourWork')}</Text>
        <RecallWorkCard
          width={cardWidth}
          height={workHeight}
          strokes={strokes}
          onStrokesChange={() => {}}
          textBoxes={textBoxes}
          onTextBoxesChange={() => {}}
          readOnly
        />

        {hasAnswer ? (
          <>
            <Text style={styles.sectionLabel}>{t('capture.backLabel')}</Text>
            <View style={[styles.photoFrame, { width: cardWidth, height: problemHeight }]}>
              {answerUri ? (
                <Image
                  source={{ uri: answerUri }}
                  style={{ width: cardWidth, height: problemHeight }}
                  resizeMode="contain"
                />
              ) : (
                <View style={[styles.photoMissing, { width: cardWidth, height: problemHeight }]} />
              )}
            </View>
          </>
        ) : (
          <Text style={styles.noAnswerHint}>{t('review.noBackPhoto')}</Text>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(16, bottomInset) }]}>
        <Button label={nextLabel} onPress={onNext} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, backgroundColor: theme.beige },
  scroll: { flex: 1 },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  sectionLabel: {
    alignSelf: 'stretch',
    fontSize: theme.font.caption,
    fontWeight: '800',
    color: theme.gray,
    marginTop: 4,
  },
  photoFrame: {
    alignSelf: 'center',
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.white,
    borderWidth: 1,
    borderColor: theme.grayLight,
  },
  photoMissing: {
    backgroundColor: theme.surface,
  },
  noAnswerHint: {
    alignSelf: 'stretch',
    textAlign: 'center',
    fontSize: theme.font.caption,
    color: theme.grayMuted,
    marginTop: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: theme.beige,
    ...webHairlineTop,
  },
});
