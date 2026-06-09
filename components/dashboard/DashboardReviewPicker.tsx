import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { SubjectReviewCard } from '@/components/SubjectReviewCard';
import { theme } from '@/constants/theme';
import type { SubjectPreviewItem } from '@/lib/files/subject-previews';
import type { SubjectFolder } from '@/lib/domain/types';
import { LANDSCAPE_CARD_RATIO } from '@/lib/ui/landscape-card-layout';
import { useViewportLayout } from '@/lib/ui/viewport-layout';

export type DashboardSubjectEntry = {
  subject: SubjectFolder;
  totalPages: number;
  duePages: number;
  previews: SubjectPreviewItem[];
};

type Props = {
  entries: DashboardSubjectEntry[];
  selectedIds: Set<string>;
  completedIds: Set<string>;
  previewIndexBySubject: Record<string, number>;
  onToggle: (subjectId: string) => void;
  onPreviewIndexChange: (subjectId: string, index: number) => void;
  onStartReview: () => void;
  canStart: boolean;
};

export function DashboardReviewPicker({
  entries,
  selectedIds,
  completedIds,
  previewIndexBySubject,
  onToggle,
  onPreviewIndexChange,
  onStartReview,
  canStart,
}: Props) {
  const { t } = useTranslation();
  const viewport = useViewportLayout();

  const rows: DashboardSubjectEntry[][] = [];
  const perRow = viewport.dashboardCardsPerRow;
  for (let i = 0; i < entries.length; i += perRow) {
    rows.push(entries.slice(i, i + perRow));
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('dashboard.pickSubjects')}</Text>
        <Pressable
          onPress={onStartReview}
          disabled={!canStart}
          style={[styles.startReviewBtn, !canStart && styles.startReviewBtnDisabled]}
          hitSlop={8}>
          <Text style={styles.startReviewBtnText}>{t('dashboard.startReview')}</Text>
        </Pressable>
      </View>
      {rows.map((row, ri) => (
        <View
          key={ri}
          style={viewport.dashboardCardsPerRow > 1 ? styles.cardRow : styles.cardRowSingle}>
          {row.map((entry) => {
            const checked = selectedIds.has(entry.subject.id);
            const completed = completedIds.has(entry.subject.id);
            return (
              <View
                key={entry.subject.id}
                style={[styles.cell, viewport.isLandscape && styles.cellLandscape]}>
                <Pressable
                  onPress={() => onToggle(entry.subject.id)}
                  style={[styles.checkHit, checked && styles.checkHitOn]}
                  hitSlop={6}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}>
                  <View style={[styles.checkbox, checked && styles.checkboxOn]}>
                    {checked ? (
                      <SymbolView
                        name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                        size={14}
                        tintColor={theme.onAccent}
                      />
                    ) : null}
                  </View>
                </Pressable>
                <SubjectReviewCard
                  subjectTag={entry.subject.name}
                  subjectColor={entry.subject.color}
                  subjectSortOrder={entry.subject.sortOrder}
                  previewItems={entry.previews}
                  totalLabel={t('dashboard.totalPages', { count: entry.totalPages })}
                  emptyHint={t('dashboard.previewEmpty')}
                  selected={checked}
                  completed={completed}
                  previewIndex={previewIndexBySubject[entry.subject.id] ?? 0}
                  onPreviewIndexChange={(index) =>
                    onPreviewIndexChange(entry.subject.id, index)
                  }
                />
              </View>
            );
          })}
          {row.length === 1 && viewport.dashboardCardsPerRow > 1 ? (
            <View style={styles.spacer} />
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4, overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: { fontSize: theme.font.body, fontWeight: '800', color: theme.black },
  startReviewBtn: {
    backgroundColor: theme.orange,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  startReviewBtnDisabled: { opacity: 0.45 },
  startReviewBtnText: { color: theme.onAccent, fontWeight: '800', fontSize: theme.font.caption },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    alignItems: 'stretch',
    width: '100%',
  },
  cardRowSingle: { marginBottom: 12, width: '100%' },
  cell: { flex: 1, minWidth: 0, position: 'relative', alignSelf: 'stretch' },
  cellLandscape: { aspectRatio: LANDSCAPE_CARD_RATIO },
  spacer: { flex: 1 },
  checkHit: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 5,
  },
  checkHitOn: {},
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: theme.grayLight,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: theme.orange,
    borderColor: theme.orange,
  },
});
