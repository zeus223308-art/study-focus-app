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
  previewIndexBySubject: Record<string, number>;
  onToggle: (subjectId: string) => void;
  onPreviewIndexChange: (subjectId: string, index: number) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
};

export function DashboardReviewPicker({
  entries,
  selectedIds,
  previewIndexBySubject,
  onToggle,
  onPreviewIndexChange,
  onSelectAll,
  onClearAll,
}: Props) {
  const { t } = useTranslation();
  const viewport = useViewportLayout();
  const allSelected = entries.length > 0 && entries.every((e) => selectedIds.has(e.subject.id));

  const rows: DashboardSubjectEntry[][] = [];
  const perRow = viewport.dashboardCardsPerRow;
  for (let i = 0; i < entries.length; i += perRow) {
    rows.push(entries.slice(i, i + perRow));
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.titleCol}>
          <Text style={styles.title}>{t('dashboard.pickSubjects')}</Text>
          <Text style={styles.hint}>{t('dashboard.pickSubjectsHint')}</Text>
        </View>
        <Pressable onPress={allSelected ? onClearAll : onSelectAll} hitSlop={8}>
          <Text style={styles.selectAll}>
            {allSelected ? t('dashboard.deselectAll') : t('dashboard.selectAll')}
          </Text>
        </Pressable>
      </View>
      {rows.map((row, ri) => (
        <View
          key={ri}
          style={viewport.dashboardCardsPerRow > 1 ? styles.cardRow : styles.cardRowSingle}>
          {row.map((entry) => {
            const checked = selectedIds.has(entry.subject.id);
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
                        tintColor={theme.white}
                      />
                    ) : null}
                  </View>
                </Pressable>
                {entry.duePages > 0 ? (
                  <View style={styles.dueBadge}>
                    <Text style={styles.dueBadgeText}>
                      {t('dashboard.dueToday', { count: entry.duePages })}
                    </Text>
                  </View>
                ) : null}
                <Pressable
                  onPress={() => onToggle(entry.subject.id)}
                  style={styles.cardPress}>
                  <SubjectReviewCard
                    subjectTag={entry.subject.name}
                    previewItems={entry.previews}
                    totalLabel={t('dashboard.totalPages', { count: entry.totalPages })}
                    emptyHint={t('dashboard.previewEmpty')}
                    selected={checked}
                    previewIndex={previewIndexBySubject[entry.subject.id] ?? 0}
                    onPreviewIndexChange={(index) =>
                      onPreviewIndexChange(entry.subject.id, index)
                    }
                  />
                </Pressable>
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
  wrap: { marginTop: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  titleCol: { flex: 1, marginRight: 8 },
  title: { fontSize: theme.font.body, fontWeight: '800', color: theme.black },
  hint: {
    fontSize: theme.font.caption,
    color: theme.gray,
    marginTop: 2,
    lineHeight: 16,
  },
  selectAll: { fontSize: theme.font.caption, fontWeight: '700', color: theme.orange },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    alignItems: 'stretch',
    width: '100%',
  },
  cardRowSingle: { marginBottom: 12, width: '100%' },
  cell: { flex: 1, minWidth: 0, position: 'relative', alignSelf: 'stretch' },
  cardPress: { flex: 1, minWidth: 0 },
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
  dueBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 5,
    backgroundColor: theme.orange,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
  },
  dueBadgeText: { fontSize: 10, fontWeight: '800', color: theme.white },
});
