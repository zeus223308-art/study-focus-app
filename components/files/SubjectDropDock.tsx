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
    <View
      style={[styles.dock, { paddingBottom: Math.max(8, insets.bottom) }]}
      {...({ dataSet: { subjectDropDock: '1' } } as object)}>
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
  row: { gap: 8, paddingBottom: 4, paddingHorizontal: 4 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.grayLight,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: theme.font.caption,
    fontWeight: '800',
    color: theme.black,
  },
});
