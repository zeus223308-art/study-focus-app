import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { DragMoveGhost } from '@/components/files/DragMoveGhost';
import { SubjectFilesCarousel } from '@/components/files/SubjectFilesCarousel';
import { VaultTrashWebPortal } from '@/components/files/VaultTrashWebPortal';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useVaultWebSubjectDrag } from '@/hooks/useVaultWebSubjectDrag';
import type { SubjectFolder } from '@/lib/domain/types';
import { getSubjectFrontPreviews } from '@/lib/files/subject-previews';
import { totalPagesInBundle } from '@/lib/grouping/bundles';
import { confirmChoice, showMessage } from '@/lib/ui/confirm';
import {
  isSubjectDragDeleteIntent,
  shouldShowVaultTrashPopup,
  type DragLiftPoint,
} from '@/lib/ui/subject-drag-delete';
import { useViewportLayout } from '@/lib/ui/viewport-layout';

const PANEL_PAD = 14;

type VaultDragSession = {
  subjectId: string;
  subjectName: string;
  lift: DragLiftPoint;
};

export default function FilesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    data,
    addSubject,
    deleteSubject,
    movingBundleId,
    reorderingSubjectId,
    startSubjectReorder,
    cancelMovingBundle,
    updateSubjectReorderHover,
    finishSubjectReorder,
  } = useApp();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const viewport = useViewportLayout();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [panelWidth, setPanelWidth] = useState(0);
  const [ghost, setGhost] = useState({ x: 0, y: 0, visible: false });
  const [dragSession, setDragSession] = useState<VaultDragSession | null>(null);
  const [webTrash, setWebTrash] = useState({ show: false, ready: false });
  const [folderTouchActive, setFolderTouchActive] = useState(false);
  const dragActiveRef = useRef(false);
  const liftRef = useRef<DragLiftPoint | null>(null);

  const lockFolderTouch = useCallback((locked: boolean) => {
    setFolderTouchActive(locked);
  }, []);

  const subjectDragActive = Boolean(dragSession) || Boolean(reorderingSubjectId);
  const screenScrollEnabled =
    !movingBundleId && !subjectDragActive && !folderTouchActive;

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

  const onSubjectReorderMove = useCallback(
    (pageX: number, pageY: number) => {
      setGhost({ x: pageX, y: pageY, visible: true });
      updateSubjectReorderHover(pageX, pageY);
      if (Platform.OS === 'web' && liftRef.current) {
        const ready = isSubjectDragDeleteIntent(
          pageX,
          pageY,
          liftRef.current,
          windowHeight
        );
        setWebTrash({ show: true, ready });
      }
    },
    [updateSubjectReorderHover, windowHeight]
  );

  useVaultWebSubjectDrag(dragActiveRef, onSubjectReorderMove);

  const handleSubjectLift = useCallback(
    (subjectId: string, subjectName: string, pageX: number, pageY: number) => {
      const lift = { x: pageX, y: pageY };
      liftRef.current = lift;
      dragActiveRef.current = true;
      if (Platform.OS === 'web') {
        setWebTrash({ show: true, ready: false });
      }
      setDragSession({ subjectId, subjectName, lift });
      setGhost({ x: pageX, y: pageY, visible: true });
      startSubjectReorder(subjectId, lift);
      onSubjectReorderMove(pageX, pageY);
    },
    [onSubjectReorderMove, startSubjectReorder]
  );

  const endDragSession = useCallback(() => {
    dragActiveRef.current = false;
    liftRef.current = null;
    if (Platform.OS === 'web') {
      setWebTrash({ show: false, ready: false });
    }
    setDragSession(null);
    setGhost((g) => ({ ...g, visible: false }));
  }, []);

  const confirmAdd = () => {
    if (!newName.trim()) return;
    addSubject(newName, data.settings.activeScheduleIds[0] ?? data.schedules[0].id);
    setNewName('');
    setAdding(false);
  };

  const trashUi = useMemo(() => {
    if (Platform.OS === 'web') {
      return webTrash;
    }
    if (!dragSession || !ghost.visible) {
      return { show: false, ready: false };
    }
    const { lift } = dragSession;
    return {
      show: shouldShowVaultTrashPopup(ghost.y, lift, windowHeight),
      ready: isSubjectDragDeleteIntent(ghost.x, ghost.y, lift, windowHeight),
    };
  }, [dragSession, ghost.visible, ghost.x, ghost.y, webTrash, windowHeight]);

  const onSubjectReorderEnd = (
    subjectId: string,
    subjectName: string,
    moved: boolean,
    pageX: number,
    pageY: number
  ) => {
    const lift = dragSession?.lift ?? liftRef.current;
    endDragSession();

    if (lift && isSubjectDragDeleteIntent(pageX, pageY, lift, windowHeight)) {
      cancelMovingBundle();
      confirmChoice({
        title: t('vault.deleteFolderTitle'),
        message: t('vault.deleteFolderMessage', { name: subjectName }),
        yesLabel: t('common.yes'),
        noLabel: t('common.no'),
        onYes: () => {
          deleteSubject(subjectId);
          showMessage('', t('vault.movedToTrash', { name: subjectName }));
        },
      });
      return;
    }

    const result = finishSubjectReorder(pageX, pageY, moved);
    if (result === 'reordered') {
      showMessage('', t('folder.reordered'));
    }
  };

  return (
    <View style={styles.screenRoot}>
      <Screen
        scroll
        scrollEnabled={screenScrollEnabled}
        lockVerticalPan={subjectDragActive}
        nestedScrollEnabled>
        <View style={styles.scrollBody}>
          {movingBundleId ? (
            <Text style={styles.moveBanner}>{t('folder.dropHint')}</Text>
          ) : null}
          {dragSession ? (
            <Text style={styles.moveBanner}>{t('vault.dragSubjectHint')}</Text>
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
                  onSubjectLift={handleSubjectLift}
                  onSubjectReorderMove={onSubjectReorderMove}
                  onSubjectReorderEnd={onSubjectReorderEnd}
                  onFolderGestureLock={lockFolderTouch}
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

          {!dragSession ? (
            <Pressable
              style={styles.trashLink}
              onPress={() => router.push('/trash')}
              accessibilityRole="button"
              accessibilityLabel={t('trash.title')}>
              <Text style={styles.trashLinkText}>{t('trash.title')}</Text>
            </Pressable>
          ) : null}
        </View>
      </Screen>

      <DragMoveGhost pageX={ghost.x} pageY={ghost.y} visible={ghost.visible} />
      <VaultTrashWebPortal visible={trashUi.show} ready={trashUi.ready} />
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    position: 'relative',
    overflow: 'visible',
  },
  scrollBody: {
    paddingBottom: 24,
  },
  trashLink: {
    marginTop: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  trashLinkText: {
    fontSize: theme.font.body,
    fontWeight: '800',
    color: theme.gray,
  },
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
});
