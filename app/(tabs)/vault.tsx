import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { DragMoveGhost } from '@/components/files/DragMoveGhost';
import { SendToNewFolderModal } from '@/components/files/SendToNewFolderModal';
import { SubjectFilesCarousel } from '@/components/files/SubjectFilesCarousel';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import type { SubjectFolder } from '@/lib/domain/types';
import { getSubjectFrontPreviews } from '@/lib/files/subject-previews';
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
  const { width: windowWidth } = useWindowDimensions();
  const viewport = useViewportLayout();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [panelWidth, setPanelWidth] = useState(0);
  const [ghost, setGhost] = useState({ x: 0, y: 0, visible: false });
  const [folderTouchActive, setFolderTouchActive] = useState(false);
  const [subjectDeleteMode, setSubjectDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(() => new Set());
  const [mergeName, setMergeName] = useState('');

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

      <View style={styles.panel}>
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
      </View>

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

      {subjectDeleteMode ? (
        <Text style={styles.deleteHint}>{t('vault.deleteSubjectsHint')}</Text>
      ) : null}

      <Pressable onPress={onDeleteSubjectsPress} style={styles.deleteSubjectsLink}>
        <Text
          style={[
            styles.deleteSubjects,
            subjectDeleteMode && selectedForDelete.size > 0 && styles.deleteSubjectsActive,
          ]}>
          {subjectDeleteMode && selectedForDelete.size > 0
            ? t('vault.deleteSubjectsConfirmAction', { count: selectedForDelete.size })
            : t('vault.deleteSubjects')}
        </Text>
      </Pressable>

      <Pressable onPress={() => router.push('/trash')} style={styles.trashLink}>
        <Text style={styles.trash}>{t('trash.title')}</Text>
      </Pressable>
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
  deleteHint: {
    marginTop: 20,
    fontSize: theme.font.caption,
    color: theme.gray,
    textAlign: 'center',
  },
  deleteSubjectsLink: { marginTop: 16, alignSelf: 'center' },
  deleteSubjects: {
    color: theme.gray,
    fontSize: theme.font.caption,
    fontWeight: '700',
  },
  deleteSubjectsActive: { color: theme.orange },
  trashLink: { marginTop: 12 },
  trash: { color: theme.gray, fontSize: theme.font.caption },
});
