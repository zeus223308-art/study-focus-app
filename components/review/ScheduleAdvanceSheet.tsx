import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';

type Props = {
  visible: boolean;
  score: number;
  nextReviewDate: string | null;
  title: string;
  body: string;
  yesLabel: string;
  noLabel: string;
  onYes: () => void;
  onNo: () => void;
};

/** Toss-style bottom sheet — advance card to next review cycle? */
export function ScheduleAdvanceSheet({
  visible,
  score,
  nextReviewDate,
  title,
  body,
  yesLabel,
  noLabel,
  onYes,
  onNo,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onNo}>
      <Pressable style={styles.backdrop} onPress={onNo}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(36, insets.bottom + 16) }]}
          onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.scorePill}>
            <Text style={styles.scoreText}>{score}%</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          {nextReviewDate ? (
            <Text style={styles.nextDate}>{nextReviewDate}</Text>
          ) : null}
          <Button label={yesLabel} onPress={onYes} style={styles.yesBtn} />
          <Button label={noLabel} variant="secondary" onPress={onNo} style={styles.noBtn} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.grayLight,
    alignSelf: 'center',
    marginBottom: 20,
  },
  scorePill: {
    alignSelf: 'flex-start',
    backgroundColor: theme.orangeSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    marginBottom: 12,
  },
  scoreText: { color: theme.orange, fontWeight: '900', fontSize: 15 },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.black,
    lineHeight: 28,
  },
  body: {
    fontSize: theme.font.body,
    color: theme.gray,
    marginTop: 10,
    lineHeight: 22,
  },
  nextDate: {
    marginTop: 12,
    fontSize: theme.font.body,
    fontWeight: '700',
    color: theme.orange,
  },
  yesBtn: { marginTop: 24 },
  noBtn: { marginTop: 10 },
});
