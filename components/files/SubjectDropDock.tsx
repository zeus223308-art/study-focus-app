import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { SubjectDropTarget } from '@/components/files/SubjectDropTarget';
import { useApp } from '@/context/AppContext';
import { theme } from '@/constants/theme';
import type { SubjectFolder } from '@/lib/domain/types';

type Props = {
  currentSubjectId: string;
  subjects: SubjectFolder[];
};

export function SubjectDropDock({ currentSubjectId, subjects }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { movingBundleId } = useApp();
  const targets = subjects.filter((s) => s.id !== currentSubjectId);

  if (!movingBundleId || targets.length === 0) return null;

  return (
    <View style={[styles.dock, { paddingBottom: Math.max(8, insets.bottom) }]}>
      <Text style={styles.hint}>{t('folder.dropHint')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {targets.map((s) => (
          <SubjectDropTarget key={s.id} subjectId={s.id} style={styles.chip}>
            <Text style={styles.chipText}>{s.name}</Text>
          </SubjectDropTarget>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.grayLight,
    backgroundColor: theme.beige,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  hint: {
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.gray,
    marginBottom: 10,
    textAlign: 'center',
  },
  row: { gap: 10, paddingBottom: 4 },
  chip: {
    minWidth: 88,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.black,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: theme.font.body,
    fontWeight: '800',
    color: theme.black,
  },
});
