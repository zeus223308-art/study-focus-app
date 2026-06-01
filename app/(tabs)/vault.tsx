import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { DragMoveGhost } from '@/components/files/DragMoveGhost';
import { SendToNewFolderModal } from '@/components/files/SendToNewFolderModal';
import { SubjectFilesCarousel } from '@/components/files/SubjectFilesCarousel';
import { TagFilterBar } from '@/components/files/TagFilterBar';
import { TrashContents, useTrashContents } from '@/components/trash/TrashContents';
import { ResolvedImage } from '@/components/ui/ResolvedImage';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import type { NotePage, SubjectFolder } from '@/lib/domain/types';
import { getPreviewImageUri } from '@/lib/files/display-image-uri';
import { getSubjectFrontPreviews } from '@/lib/files/subject-previews';
import { resolveTagColor } from '@/lib/ui/tag-colors';
import { countActivePagesForSubject } from '@/services/storage';
import { confirmChoice, showMessage } from '@/lib/ui/confirm';
import {
  computeVaultFoldersPerPage,
  useViewportLayout,
} from '@/lib/ui/viewport-layout';

const PANEL_PAD = 14;

export default function FilesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    data,
    addSubject,
    deleteSubject,
    deleteSubjects,
    movingBundleId,
    reorderingSubjectId,
    startSubjectReorder,
    updateSubjectReorderHover,
    finishSubjectReorder,
    pendingSubjectMerge,
    confirmSubjectMerge,
    cancelSubjectMerge,
  } = useApp();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const viewport = useViewportLayout();
  const trash = useTrashContents();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [panelWidth, setPanelWidth] = useState(0);
  const [ghost, setGhost] = useState({ x: 0, y: 0, visible: false });
  const [folderTouchActive, setFolderTouchActive] = useState(false);
  const [subjectDeleteMode, setSubjectDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(() => new Set());
  const [mergeName, setMergeName] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [resultsWidth, setResultsWidth] = useState(0);

  const tagColor = resolveTagColor(data.settings.tagColor);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const bundle of data.bundles) {
      if (bundle.archived) continue;
      for (const page of bundle.pages) {
        for (const tag of page.tags ?? []) {
          const trimmed = tag.trim();
          if (trimmed) set.add(trimmed);
        }
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [data.bundles]);

  const matchingPhotos = useMemo<{ bundleId: string; page: NotePage }[]>(() => {
    if (!activeTag) return [];
    const out: { bundleId: string; page: NotePage }[] = [];
    for (const bundle of data.bundles) {
      if (bundle.archived) continue;
      for (const page of bundle.pages) {
        if ((page.tags ?? []).some((tag) => tag.trim() === activeTag)) {
          out.push({ bundleId: bundle.id, page });
        }
      }
    }
    return out;
  }, [activeTag, data.bundles]);

  const gridCols = viewport.isPhone ? 3 : 4;
  const cellW = useMemo(() => {
    const w = resultsWidth > 0 ? resultsWidth : Math.max(280, windowWidth - 40);
    const gap = 8;
    return Math.floor((w - gap * (gridCols - 1)) / gridCols);
  }, [resultsWidth, windowWidth, gridCols]);

  useEffect(() => {
    if (pendingSubjectMerge) {
      setMergeName(pendingSubjectMerge.defaultName);
    }
  }, [pendingSubjectMerge]);

  const lockFolderTouch = useCallback((locked: boolean) => {
    setFolderTouchActive(locked);
  }, []);

  const screenScrollEnabled = !reorderingSubjectId && !folderTouchActive;

  useEffect(() => {
    if (!subjectDeleteMode) {
      setFolderTouchActive(false);
    }
  }, [subjectDeleteMode]);

  const toggleSubjectDeleteSelect = useCallback((subjectId: string) => {
    setSelectedForDelete((prev) => {
      const next = new Set(prev);
      if (next.has(subjectId)) next.delete(subjectId);
      else next.add(subjectId);
      return next;
    });
  }, []);

  const exitSubjectDeleteMode = useCallback(() => {
    setSubjectDeleteMode(false);
    setSelectedForDelete(new Set());
  }, []);

  const onDeleteSubjectsPress = useCallback(() => {
    if (!subjectDeleteMode) {
      setSubjectDeleteMode(true);
      setSelectedForDelete(new Set());
      return;
    }
    if (selectedForDelete.size === 0) {
      exitSubjectDeleteMode();
      return;
    }
    const count = selectedForDelete.size;
    confirmChoice({
      title: t('vault.deleteSubjectsConfirmTitle'),
      message: t('vault.deleteSubjectsConfirmMessage', { count }),
      yesLabel: t('common.yes'),
      noLabel: t('common.no'),
      onYes: () => {
        deleteSubjects([...selectedForDelete]);
        exitSubjectDeleteMode();
        showMessage(t('vault.movedToTrashTitle'), t('vault.movedToTrashMessage'));
      },
    });
  }, [
    deleteSubjects,
    exitSubjectDeleteMode,
    selectedForDelete,
    subjectDeleteMode,
    t,
  ]);

  const pageWidth = panelWidth > 0 ? panelWidth : Math.max(280, windowWidth - 40);

  const foldersPerPage = useMemo(() => {
    const basis = panelWidth > 0 ? panelWidth : viewport.width;
    return computeVaultFoldersPerPage(basis);
  }, [panelWidth, viewport.width]);

  const subjectPages = useMemo(() => {
    const sorted = [...data.subjects].sort((a, b) => a.sortOrder - b.sortOrder);
    const pages: SubjectFolder[][] = [];
    for (let i = 0; i < sorted.length; i += foldersPerPage) {
      pages.push(sorted.slice(i, i + foldersPerPage));
    }
    return pages;
  }, [data.subjects, foldersPerPage]);

  const pageCountFor = (subjectId: string) => countActivePagesForSubject(data, subjectId);

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

  const onSubjectReorderMove = (pageX: number, pageY: number) => {
    setGhost({ x: pageX, y: pageY, visible: true });
    updateSubjectReorderHover(pageX, pageY);
  };

  const onSubjectReorderEnd = (
    _subjectId: string,
    _subjectName: string,
    moved: boolean,
    pageX: number,
    pageY: number
  ) => {
    setGhost({ x: pageX, y: pageY, visible: false });
    finishSubjectReorder(pageX, pageY, moved);
  };

  return (
    <Screen scroll scrollEnabled={screenScrollEnabled} nestedScrollEnabled>
      {movingBundleId ? (
        <Text style={styles.moveBanner}>{t('folder.dropHint')}</Text>
      ) : null}
      {reorderingSubjectId ? (
        <Text style={styles.moveBanner}>{t('vault.reorderDragHint')}</Text>
      ) : null}

      <ScreenHeader
        title={t('vault.title')}
        showSettings={false}
        right={
          <Pressable onPress={() => router.push('/search')} hitSlop={8}>
            <Text style={styles.headerAction}>{t('item.search')}</Text>
          </Pressable>
        }
      />

      <TagFilterBar
        tags={allTags}
        color={tagColor}
        activeTag={activeTag}
        onSelect={setActiveTag}
      />

      {activeTag ? (
        <View
          style={styles.results}
          onLayout={(e) => {
            const w = Math.round(e.nativeEvent.layout.width);
            if (w > 0 && w !== resultsWidth) setResultsWidth(w);
          }}>
          <Text style={styles.resultsTitle}>
            {t('vault.tagFilterCount', { tag: activeTag, count: matchingPhotos.length })}
          </Text>
          {matchingPhotos.length === 0 ? (
            <Text style={styles.resultsEmpty}>{t('vault.tagFilterEmpty')}</Text>
          ) : (
            <View style={styles.grid}>
              {matchingPhotos.map(({ bundleId, page }) => {
                const uri = getPreviewImageUri(page.asset);
                return (
                  <Pressable
                    key={page.id}
                    style={[styles.gridCell, { width: cellW, height: cellW }]}
                    onPress={() =>
                      router.push({
                        pathname: '/bundle/[id]',
                        params: { id: bundleId, pageId: page.id },
                      })
                    }>
                    {uri ? (
                      <ResolvedImage uri={uri} asset={page.asset} style={styles.gridImg} resizeMode="cover" />
                    ) : (
                      <View style={[styles.gridImg, styles.gridEmpty]} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      ) : (
        <>
          <View style={[styles.panel, { marginTop: Math.round(windowHeight * 0.16) }]}>
            <View
              style={styles.carouselSlot}
              onLayout={(e) => {
                const w = Math.round(e.nativeEvent.layout.width);
                if (w > 0 && w !== panelWidth) setPanelWidth(w);
              }}>
              <SubjectFilesCarousel
                pages={subjectPages}
                pageWidth={pageWidth}
                foldersPerPage={foldersPerPage}
                onAddFolder={subjectDeleteMode ? undefined : () => setAdding(true)}
                addFolderLabel={subjectDeleteMode ? undefined : t('vault.addFolderCard')}
                subjectDeleteMode={subjectDeleteMode}
                selectedSubjectIds={selectedForDelete}
                onToggleSubjectDelete={toggleSubjectDeleteSelect}
                totalLabelFor={(id) => t('vault.totalPages', { count: pageCountFor(id) })}
                previewItemsFor={(id) => getSubjectFrontPreviews(data, id)}
                onSubjectPress={(subjectId) =>
                  router.push({ pathname: '/folder/[id]', params: { id: subjectId } })
                }
                onSubjectLift={startSubjectReorder}
                onSubjectReorderMove={onSubjectReorderMove}
                onSubjectReorderEnd={onSubjectReorderEnd}
                onFolderGestureLock={lockFolderTouch}
                onSubjectDeleteHold={confirmDeleteSubject}
              />
            </View>

            {subjectDeleteMode ? (
              <Text style={styles.deleteHint}>{t('vault.deleteSubjectsHint')}</Text>
            ) : null}

            <Pressable
              onPress={onDeleteSubjectsPress}
              style={({ pressed }) => [
                styles.deleteBtn,
                subjectDeleteMode && selectedForDelete.size > 0 && styles.deleteBtnActive,
                pressed && styles.deleteBtnPressed,
              ]}>
              <Text
                style={[
                  styles.deleteBtnText,
                  subjectDeleteMode && selectedForDelete.size > 0 && styles.deleteBtnTextActive,
                ]}>
                {subjectDeleteMode && selectedForDelete.size > 0
                  ? t('vault.deleteSubjectsConfirmAction', { count: selectedForDelete.size })
                  : t('vault.deleteSubjects')}
              </Text>
            </Pressable>
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
          ) : null}

          <View style={styles.trashCard}>
            <View style={styles.trashCardHeader}>
              <Text style={styles.trashCardTitle}>{t('trash.title')}</Text>
              {trash.count > 0 ? (
                <View style={styles.trashCount}>
                  <Text style={styles.trashCountText}>{trash.count}</Text>
                </View>
              ) : null}
            </View>
            <TrashContents />
          </View>
        </>
      )}

      <DragMoveGhost pageX={ghost.x} pageY={ghost.y} visible={ghost.visible} />

      <SendToNewFolderModal
        visible={Boolean(pendingSubjectMerge)}
        title={t('vault.mergeSubjectsTitle')}
        hint={t('vault.mergeSubjectsHint')}
        name={mergeName}
        placeholder={t('vault.mergeSubjectsPlaceholder')}
        sendLabel={t('vault.mergeSubjectsConfirm')}
        cancelLabel={t('common.cancel')}
        onChangeName={setMergeName}
        onSend={() => {
          const trimmed = mergeName.trim();
          if (!trimmed) return;
          confirmSubjectMerge(trimmed);
          showMessage('', t('vault.mergeSubjectsDone', { name: trimmed }));
        }}
        onClose={cancelSubjectMerge}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerAction: { fontSize: theme.font.bodySmall, color: theme.orange, fontWeight: '700' },
  moveBanner: {
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.orange,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  panel: {
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
  deleteHint: {
    marginTop: 14,
    marginHorizontal: PANEL_PAD,
    fontSize: theme.font.caption,
    color: theme.gray,
    textAlign: 'center',
  },
  deleteBtn: {
    marginTop: 12,
    alignSelf: 'center',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.grayLight,
    backgroundColor: theme.beige,
    alignItems: 'center',
  },
  deleteBtnActive: {
    borderColor: theme.orange,
    backgroundColor: theme.orange,
  },
  deleteBtnPressed: { opacity: 0.85 },
  deleteBtnText: {
    color: theme.gray,
    fontSize: theme.font.label,
    fontWeight: '800',
  },
  deleteBtnTextActive: { color: theme.onAccent },
  trashCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: theme.radius.md,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.grayLight,
  },
  trashCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  trashCardTitle: { fontSize: theme.font.heading, fontWeight: '900', color: theme.black },
  trashCount: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: 11,
    backgroundColor: theme.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trashCountText: { fontSize: 12, fontWeight: '800', color: theme.black },
  results: { marginTop: 12 },
  resultsTitle: {
    fontSize: theme.font.bodySmall,
    fontWeight: '800',
    color: theme.black,
    marginBottom: 12,
  },
  resultsEmpty: { color: theme.gray, textAlign: 'center', marginVertical: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridCell: { borderRadius: 10, overflow: 'hidden', backgroundColor: theme.surface },
  gridImg: { width: '100%', height: '100%' },
  gridEmpty: { backgroundColor: theme.grayLight },
});
