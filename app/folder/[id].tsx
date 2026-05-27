import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateAlbumSection } from '@/components/files/DateAlbumSection';
import { DragMoveGhost } from '@/components/files/DragMoveGhost';
import { PhotoActionSheet } from '@/components/files/PhotoActionSheet';
import { SubjectArchiveHeaderButton } from '@/components/files/SubjectArchiveHeaderButton';
import { SubjectArchiveModal } from '@/components/files/SubjectArchiveModal';
import { SubjectDropDock } from '@/components/files/SubjectDropDock';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import { useApp, useLanguage } from '@/context/AppContext';
import { groupSubjectProblemsByDate, listSubjectProblems } from '@/lib/grouping/bundles';
import type { SubjectProblemItem } from '@/lib/grouping/bundles';
import { pickForImport } from '@/lib/import/pick-for-import';
import { confirmChoice, showMessage } from '@/lib/ui/confirm';
import { NotFoundView } from '@/components/ui/NotFoundView';
import { useViewportLayout } from '@/lib/ui/viewport-layout';

const ALBUM_GAP = 8;

function itemKey(item: SubjectProblemItem) {
  return `${item.bundleId}:${item.pageId}`;
}

export default function FolderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { language } = useLanguage();
  const {
    data,
    localToday,
    importPhotosToSubject,
    updateDragHover,
    finishItemDrag,
    startItemDrag,
    movingBundleId,
    dragHoverSubjectId,
    cancelMovingBundle,
    deletePage,
    archiveBundle,
  } = useApp();
  const [importing, setImporting] = useState(false);
  const [ghost, setGhost] = useState({ x: 0, y: 0, visible: false });
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [actionItem, setActionItem] = useState<SubjectProblemItem | null>(null);
  const [archiveSelectMode, setArchiveSelectMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [tileGestureActive, setTileGestureActive] = useState(false);
  const viewport = useViewportLayout();
  const insets = useSafeAreaInsets();

  const subject = data.subjects.find((s) => s.id === id);
  const problems = useMemo(
    () => listSubjectProblems(data.bundles, id ?? '', subject?.itemOrder),
    [data.bundles, id, subject?.itemOrder]
  );
  const dateSections = useMemo(() => groupSubjectProblemsByDate(problems), [problems]);

  const albumContentWidth = Math.min(
    viewport.width - 32,
    viewport.contentMaxWidth - 32
  );

  const albumLabels = useMemo(
    () => ({
      today: t('folder.dateToday'),
      yesterday: t('folder.dateYesterday'),
      photoCount: (count: number) => t('folder.photoCount', { count }),
      problemLabel: (n: number) => t('folder.problemLabel', { n }),
    }),
    [t]
  );

  const importNewProblem = async () => {
    if (!subject || importing) return;

    const picked = await pickForImport({
      title: t('folder.importSourceTitle'),
      album: t('folder.importAlbum'),
      files: t('folder.importFiles'),
      cancel: t('common.cancel'),
      unsupportedOnly: t('folder.importUnsupportedOnly'),
      unsupportedSkipped: t('folder.importUnsupportedSkipped'),
    });
    if (!picked.ok) {
      if (picked.reason === 'denied') {
        Alert.alert('', t('folder.importPermission'));
      }
      return;
    }

    setImporting(true);
    try {
      const saved = await importPhotosToSubject(
        subject.id,
        picked.files.map((f) => f.uri),
        localToday
      );
      if (saved > 0) {
        showMessage('', t('folder.importSaved', { count: saved }));
      }
    } finally {
      setImporting(false);
    }
  };

  const onDragMove = (pageX: number, pageY: number) => {
    setGhost({ x: pageX, y: pageY, visible: true });
    updateDragHover(pageX, pageY);
  };

  const confirmDeleteProblem = (bundleId: string, pageId: string) => {
    confirmChoice({
      title: t('item.deletePhotoTitle'),
      message: t('item.deletePhotoMessage'),
      yesLabel: t('common.yes'),
      noLabel: t('common.no'),
      onYes: () => deletePage(bundleId, pageId),
    });
  };

  const onLiftItemForDrag = (item: SubjectProblemItem) => {
    if (!subject) return;
    startItemDrag(item.bundleId, item.pageId, subject.id, itemKey(item));
  };

  const handleItemDragEnd = (
    moved: boolean,
    pageX: number,
    pageY: number,
    item: SubjectProblemItem
  ) => {
    setGhost({ x: pageX, y: pageY, visible: false });
    const moveTargetId = dragHoverSubjectId;
    const result = finishItemDrag(pageX, pageY, moved);
    if (result === 'reordered') {
      showMessage('', t('folder.reordered'));
    } else if (result === 'moved') {
      const name = data.subjects.find((s) => s.id === moveTargetId)?.name ?? '';
      Alert.alert('', t('folder.movedTo', { name }));
    }
  };

  const toggleArchiveSelect = (item: SubjectProblemItem) => {
    const key = itemKey(item);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const confirmArchiveSelected = () => {
    const bundleIds = new Set<string>();
    for (const key of selectedKeys) {
      bundleIds.add(key.split(':')[0]!);
    }
    for (const bid of bundleIds) {
      archiveBundle(bid);
    }
    setArchiveSelectMode(false);
    setSelectedKeys(new Set());
    showMessage('', t('folder.archivedCount', { count: bundleIds.size }));
  };

  const lockTileGesture = useCallback((active: boolean) => {
    setTileGestureActive(active);
  }, []);

  const albumScrollEnabled = !movingBundleId && !archiveSelectMode && !tileGestureActive;

  if (!subject) {
    return (
      <Screen>
        <NotFoundView backFallback="/(tabs)/vault" />
      </Screen>
    );
  }

  const addProblemZone = (
    <Pressable
      onPress={importNewProblem}
      disabled={importing || archiveSelectMode}
      style={({ pressed }) => [styles.addZone, pressed && styles.addZonePressed]}
      accessibilityLabel={t('folder.addProblem')}>
      {importing ? (
        <ActivityIndicator color={theme.orange} />
      ) : (
        <>
          <SymbolView
            name={{ ios: 'plus.circle.fill', android: 'add', web: 'add' }}
            size={28}
            tintColor={theme.orange}
          />
          <Text style={styles.addTitle}>{t('folder.addProblem')}</Text>
        </>
      )}
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <Screen padded={false}>
        <View style={styles.header}>
          <ScreenHeader
            title={subject.name}
            showBack
            backFallback="/(tabs)/vault"
            showSettings={false}
            right={
              <SubjectArchiveHeaderButton
                label={t('folder.archive')}
                onPress={() => setArchiveModalOpen(true)}
              />
            }
          />
          {movingBundleId && (
            <Pressable onPress={cancelMovingBundle} style={styles.cancelMove}>
              <Text style={styles.cancelMoveText}>{t('common.cancel')}</Text>
            </Pressable>
          )}
        </View>
        <ScrollView
          scrollEnabled={albumScrollEnabled}
          contentContainerStyle={[
            styles.scroll,
            problems.length === 0 && styles.scrollEmpty,
            viewport.isTablet && {
              maxWidth: viewport.contentMaxWidth,
              alignSelf: 'center',
              width: '100%',
            },
          ]}
          showsVerticalScrollIndicator={false}>
          {dateSections.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Text style={styles.empty}>{t('folder.empty')}</Text>
              {addProblemZone}
            </View>
          ) : (
            dateSections.map((section) => (
              <DateAlbumSection
                key={section.studyDate}
                section={section}
                language={language}
                subjectId={subject.id}
                albumColumns={viewport.albumNumColumns}
                contentWidth={albumContentWidth}
                gap={ALBUM_GAP}
                labels={albumLabels}
                onOpen={(bundleId, pageId) =>
                  router.push({
                    pathname: '/bundle/[id]',
                    params: { id: bundleId, pageId },
                  })
                }
                onLiftItemForDrag={onLiftItemForDrag}
                onDragMove={archiveSelectMode ? undefined : onDragMove}
                onDragEnd={
                  archiveSelectMode
                    ? undefined
                    : (item, moved, pageX, pageY) =>
                        handleItemDragEnd(moved, pageX, pageY, item)
                }
                reorderEnabled={!archiveSelectMode}
                onGestureActiveChange={lockTileGesture}
                onPhotoAction={
                  archiveSelectMode ? undefined : (item) => setActionItem(item)
                }
                selectionMode={archiveSelectMode ? 'pick' : null}
                selectedKeys={selectedKeys}
                onToggleSelect={toggleArchiveSelect}
              />
            ))
          )}
          <View style={styles.footerAdd}>{addProblemZone}</View>
        </ScrollView>
      </Screen>

      {archiveSelectMode ? (
        <View style={[styles.archiveBar, { paddingBottom: Math.max(16, insets.bottom) }]}>
          <Button
            label={t('folder.saveToArchiveCount', { count: selectedKeys.size })}
            onPress={confirmArchiveSelected}
            disabled={selectedKeys.size === 0}
          />
          <Button
            label={t('common.cancel')}
            variant="ghost"
            onPress={() => {
              setArchiveSelectMode(false);
              setSelectedKeys(new Set());
            }}
            style={{ marginTop: 8 }}
          />
        </View>
      ) : null}

      <SubjectDropDock currentSubjectId={subject.id} subjects={data.subjects} />
      <DragMoveGhost pageX={ghost.x} pageY={ghost.y} visible={ghost.visible} />

      <SubjectArchiveModal
        visible={archiveModalOpen}
        subjectId={subject.id}
        subjectName={subject.name}
        onClose={() => setArchiveModalOpen(false)}
      />

      <PhotoActionSheet
        visible={actionItem !== null}
        restoreLabel={t('folder.restoreFromArchive')}
        saveToArchiveLabel={t('folder.saveToArchive')}
        cancelLabel={t('common.cancel')}
        deleteLabel={t('item.deletePhoto')}
        onDelete={() => {
          if (actionItem) {
            const { bundleId, pageId } = actionItem;
            setActionItem(null);
            confirmDeleteProblem(bundleId, pageId);
          }
        }}
        onRestore={() => {
          setActionItem(null);
          setArchiveModalOpen(true);
        }}
        onSaveToArchive={() => {
          if (actionItem) {
            setActionItem(null);
            setArchiveSelectMode(true);
            setSelectedKeys(new Set([itemKey(actionItem)]));
          }
        }}
        onClose={() => setActionItem(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20 },
  cancelMove: { alignSelf: 'flex-end', marginTop: -12, marginBottom: 8 },
  cancelMoveText: { fontSize: theme.font.caption, fontWeight: '700', color: theme.orange },
  scroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },
  scrollEmpty: { flexGrow: 1, justifyContent: 'center' },
  emptyBlock: { marginTop: 24, marginBottom: 8, gap: 16 },
  empty: { textAlign: 'center', color: theme.gray },
  footerAdd: { marginTop: 8 },
  addZone: {
    minHeight: 72,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.orange,
    backgroundColor: theme.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 8,
  },
  addZonePressed: { opacity: 0.85 },
  addTitle: {
    fontSize: theme.font.body,
    fontWeight: '800',
    color: theme.orange,
  },
  archiveBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.grayLight,
    backgroundColor: theme.beige,
  },
});
