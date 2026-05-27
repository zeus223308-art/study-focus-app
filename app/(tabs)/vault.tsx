import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { SubjectFilesCarousel } from '@/components/files/SubjectFilesCarousel';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import type { SubjectFolder } from '@/lib/domain/types';
import { getSubjectFrontPreviews } from '@/lib/files/subject-previews';
import { totalPagesInBundle } from '@/lib/grouping/bundles';
import { confirmChoice } from '@/lib/ui/confirm';
import { useViewportLayout } from '@/lib/ui/viewport-layout';

const PANEL_PAD = 14;

export default function FilesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, addSubject, deleteSubject, movingBundleId } = useApp();
  const { width: windowWidth } = useWindowDimensions();
  const viewport = useViewportLayout();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [panelWidth, setPanelWidth] = useState(0);

  const pageWidth = panelWidth > 0 ? panelWidth : Math.max(280, windowWidth - 40);

  const subjectPages = useMemo(() => {
    const sorted = [...data.subjects].sort((a, b) => a.sortOrder - b.sortOrder);
    const pages: SubjectFolder[][] = [];
    const perPage = viewport.vaultFoldersPerPage;
    for (let i = 0; i < sorted.length; i += perPage) {
      pages.push(sorted.slice(i, i + perPage));
    }
    return pages;
  }, [data.subjects, viewport.vaultFoldersPerPage]);

  const pageCountFor = (subjectId: string) =>
    data.bundles
      .filter((b) => b.subjectId === subjectId && !b.archived)
      .reduce((n, b) => n + totalPagesInBundle(b), 0);

  const confirmAdd = () => {
    if (!newName.trim()) return;
    addSubject(newName, data.settings.activeScheduleIds[0] ?? data.schedules[0].id);
    setNewName('');
    setAdding(false);
  };

  const confirmDeleteSubject = (subjectId: string, subjectName: string) => {
    confirmChoice({
      title: t('vault.deleteFolderTitle'),
      message: t('vault.deleteFolderMessage', { name: subjectName }),
      yesLabel: t('common.yes'),
      noLabel: t('common.no'),
      onYes: () => deleteSubject(subjectId),
    });
  };

  return (
    <Screen scroll nestedScrollEnabled>
      {movingBundleId ? (
        <Text style={styles.moveBanner}>{t('folder.dropHint')}</Text>
      ) : null}

      <ScreenHeader
        title={t('vault.title')}
        showSettings={false}
        right={
          <Pressable onPress={() => router.push('/search')}>
            <Text style={styles.search}>{t('item.search')}</Text>
          </Pressable>
        }
      />

      <View style={styles.panel}>
        <View
          style={styles.carouselSlot}
          onLayout={(e) => {
            const w = Math.round(e.nativeEvent.layout.width);
            if (w > 0 && w !== panelWidth) setPanelWidth(w);
          }}>
          {data.subjects.length === 0 ? (
            <View style={styles.emptyVault}>
              <Text style={styles.emptyVaultText}>{t('folder.empty')}</Text>
              <Button label={t('vault.addFolder')} onPress={() => setAdding(true)} />
            </View>
          ) : (
            <SubjectFilesCarousel
              pages={subjectPages}
              pageWidth={pageWidth}
              foldersPerPage={viewport.vaultFoldersPerPage}
              totalLabelFor={(id) => t('vault.totalPages', { count: pageCountFor(id) })}
              previewItemsFor={(id) => getSubjectFrontPreviews(data, id)}
              onSubjectPress={(subjectId) =>
                router.push({ pathname: '/folder/[id]', params: { id: subjectId } })
              }
              onSubjectDeletePress={confirmDeleteSubject}
              swipeHint={subjectPages.length > 1 ? t('vault.swipeHint') : undefined}
            />
          )}
        </View>
      </View>

      {adding ? (
        <View style={styles.addBox}>
          <TextInput value={newName} onChangeText={setNewName} style={styles.input} autoFocus />
          <View style={styles.addActions}>
            <Pressable onPress={() => setAdding(false)}>
              <Text style={styles.cancel}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable onPress={confirmAdd}>
              <Text style={styles.save}>{t('common.save')}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setAdding(true)}>
          <Text style={styles.addLabel}>+ {t('vault.addFolder')}</Text>
        </Pressable>
      )}

      <Pressable onPress={() => router.push('/trash')} style={styles.trashLink}>
        <Text style={styles.trash}>{t('trash.title')}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { fontSize: theme.font.bodySmall, color: theme.orange, fontWeight: '700' },
  emptyVault: { alignItems: 'center', paddingVertical: 32, gap: 14 },
  emptyVaultText: { fontSize: theme.font.body, color: theme.gray, fontWeight: '600' },
  moveBanner: {
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.orange,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  panel: {
    borderWidth: 1.5,
    borderColor: theme.black,
    borderRadius: theme.radius.sm,
    paddingVertical: PANEL_PAD,
    backgroundColor: theme.surface,
    overflow: 'hidden',
  },
  carouselSlot: {
    width: '100%',
  },
  addBox: {
    marginTop: 20,
    backgroundColor: theme.surface,
    padding: 16,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.grayLight,
  },
  input: { fontSize: theme.font.body },
  addActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 12 },
  cancel: { color: theme.gray },
  save: { color: theme.orange, fontWeight: '800' },
  addLabel: { marginTop: 20, fontWeight: '700', color: theme.gray },
  trashLink: { marginTop: 24 },
  trash: { color: theme.gray, fontSize: theme.font.caption },
});
