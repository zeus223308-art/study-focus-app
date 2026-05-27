import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

import { DateRibbon } from '@/components/dashboard/DateRibbon';
import { DateAlbumSection } from '@/components/files/DateAlbumSection';
import { DragMoveGhost } from '@/components/files/DragMoveGhost';
import { SendToNewFolderModal } from '@/components/files/SendToNewFolderModal';
import { SubjectArchiveHeaderButton } from '@/components/files/SubjectArchiveHeaderButton';
import { SubjectArchiveModal } from '@/components/files/SubjectArchiveModal';
import { SubjectDropDock } from '@/components/files/SubjectDropDock';
import { SubjectPickerModal } from '@/components/files/SubjectPickerModal';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import { useApp, useLanguage } from '@/context/AppContext';
import type { PageRef } from '@/lib/domain/move-pages-batch';
import {
  buildSubjectStudyDateMarks,
  filterProblemsByStudyDate,
  groupSubjectProblemsByDate,
  listSubjectProblems,
} from '@/lib/grouping/bundles';
import type { SubjectProblemItem } from '@/lib/grouping/bundles';
import { pickForImport } from '@/lib/import/pick-for-import';
import { remainingPhotoSlots } from '@/services/storage';
import { confirmChoice, showMessage } from '@/lib/ui/confirm';
import { NotFoundView } from '@/components/ui/NotFoundView';
import { useViewportLayout } from '@/lib/ui/viewport-layout';

const ALBUM_GAP = 2;

function itemKey(item: SubjectProblemItem) {
  return `${item.bundleId}:${item.pageId}`;
}

function keysToPageRefs(keys: Set<string>): PageRef[] {
  return [...keys].map((key) => {
    const [bundleId, pageId] = key.split(':');
    return { bundleId: bundleId!, pageId: pageId! };
  });
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
    moveProblemsToNewSubject,
    moveProblemsToSubject,
    setPaywallVisible,
  } = useApp();
  const [albumFilterDate, setAlbumFilterDate] = useState(localToday);
  const [importing, setImporting] = useState(false);
  const [ghost, setGhost] = useState({ x: 0, y: 0, visible: false });
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [otherPickerOpen, setOtherPickerOpen] = useState(false);
  const [otherSubjectId, setOtherSubjectId] = useState<string | null>(null);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archiveSelectMode, setArchiveSelectMode] = useState(false);
  const [archiveSelectedKeys, setArchiveSelectedKeys] = useState<Set<string>>(new Set());
  const [exportSelectMode, setExportSelectMode] = useState(false);
  const [exportSelectedKeys, setExportSelectedKeys] = useState<Set<string>>(new Set());
  const [tileGestureActive, setTileGestureActive] = useState(false);
  const viewport = useViewportLayout();
  const insets = useSafeAreaInsets();

  const subject = data.subjects.find((s) => s.id === id);
  const problems = useMemo(
    () => listSubjectProblems(data.bundles, id ?? '', subject?.itemOrder),
    [data.bundles, id, subject?.itemOrder]
  );
  useEffect(() => {
    setAlbumFilterDate(localToday);
  }, [id, localToday]);

  const subjectRibbonMarks = useMemo(
    () => buildSubjectStudyDateMarks(problems, data.settings.firstLaunchDate),
    [problems, data.settings.firstLaunchDate]
  );

  const filteredProblems = useMemo(
    () => filterProblemsByStudyDate(problems, albumFilterDate),
    [problems, albumFilterDate]
  );

  const dateSections = useMemo(
    () => groupSubjectProblemsByDate(filteredProblems),
    [filteredProblems]
  );

  const pickMode = exportSelectMode || archiveSelectMode;
  const activeSelectedKeys = exportSelectMode ? exportSelectedKeys : archiveSelectedKeys;

  const otherSubjects = useMemo(
    () =>
      [...data.subjects]
        .filter((s) => s.id !== subject?.id)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [data.subjects, subject?.id]
  );

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

  const exitExportSelect = useCallback(() => {
    setExportSelectMode(false);
    setExportSelectedKeys(new Set());
  }, []);

  const enterExportSelect = useCallback((item: SubjectProblemItem) => {
    setArchiveSelectMode(false);
    setArchiveSelectedKeys(new Set());
    setExportSelectMode(true);
    setExportSelectedKeys(new Set([itemKey(item)]));
  }, []);

  const toggleExportSelect = useCallback((item: SubjectProblemItem) => {
    const key = itemKey(item);
    setExportSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const importNewProblem = async () => {
    if (!subject || importing || pickMode) return;

    if (remainingPhotoSlots(data) <= 0) {
      setPaywallVisible(true);
      return;
    }

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
      const { saved, skippedDueToLimit } = await importPhotosToSubject(
        subject.id,
        picked.files.map((f) => f.uri),
        localToday
      );
      if (saved > 0 && skippedDueToLimit > 0) {
        showMessage(
          '',
          t('folder.importPartialLimit', { saved, skipped: skippedDueToLimit })
        );
      } else if (saved > 0) {
        showMessage('', t('folder.importSaved', { count: saved }));
      } else if (skippedDueToLimit > 0) {
        showMessage('', t('folder.importLimitReached'));
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
    if (!subject || pickMode) return;
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
    if (result === 'moved') {
      const name = data.subjects.find((s) => s.id === moveTargetId)?.name ?? '';
      Alert.alert('', t('folder.movedTo', { name }));
    }
  };

  const toggleArchiveSelect = (item: SubjectProblemItem) => {
    const key = itemKey(item);
    setArchiveSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const confirmArchiveSelected = () => {
    const bundleIds = new Set<string>();
    for (const key of archiveSelectedKeys) {
      bundleIds.add(key.split(':')[0]!);
    }
    for (const bid of bundleIds) {
      archiveBundle(bid);
    }
    setArchiveSelectMode(false);
    setArchiveSelectedKeys(new Set());
    showMessage('', t('folder.archivedCount', { count: bundleIds.size }));
  };

  const lockTileGesture = useCallback((active: boolean) => {
    setTileGestureActive(active);
  }, []);

  const openNewFolderModal = () => {
    if (exportSelectedKeys.size === 0) return;
    setNewFolderName('');
    setSendModalOpen(true);
  };

  const confirmSendToNewFolder = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed || exportSelectedKeys.size === 0) return;

    const items = keysToPageRefs(exportSelectedKeys);
    const newSubjectId = moveProblemsToNewSubject(items, trimmed);
    setSendModalOpen(false);
    exitExportSelect();

    if (!newSubjectId) return;
    showMessage('', t('folder.sendToNewFolderDone', { name: trimmed }));
    router.replace({ pathname: '/folder/[id]', params: { id: newSubjectId } });
  };

  const openOtherSubjectPicker = () => {
    if (exportSelectedKeys.size === 0) return;
    setOtherSubjectId(null);
    setOtherPickerOpen(true);
  };

  const confirmSendToOtherSubject = () => {
    if (!otherSubjectId || exportSelectedKeys.size === 0) return;
    const items = keysToPageRefs(exportSelectedKeys);
    const ok = moveProblemsToSubject(items, otherSubjectId);
    setOtherPickerOpen(false);
    exitExportSelect();
    if (!ok) return;
    const name = data.subjects.find((s) => s.id === otherSubjectId)?.name ?? '';
    showMessage(
      '',
      t('folder.sendToOtherFolderDone', { name, count: items.length })
    );
    if (otherSubjectId !== subject?.id) {
      router.replace({ pathname: '/folder/[id]', params: { id: otherSubjectId } });
    }
  };

  const albumScrollEnabled = !movingBundleId && !pickMode && !tileGestureActive;

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
      disabled={importing || pickMode}
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
          {exportSelectMode ? (
            <Text style={styles.exportHint}>{t('folder.exportSelectHint')}</Text>
          ) : null}
          {movingBundleId && (
            <Pressable onPress={cancelMovingBundle} style={styles.cancelMove}>
              <Text style={styles.cancelMoveText}>{t('common.cancel')}</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.ribbonWrap}>
          <DateRibbon
            marks={subjectRibbonMarks}
            selectedDate={albumFilterDate}
            firstLaunchDate={data.settings.firstLaunchDate}
            localToday={localToday}
            onSelectDate={setAlbumFilterDate}
          />
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
              <Text style={styles.empty}>
                {problems.length === 0 ? t('folder.empty') : t('folder.emptyDate')}
              </Text>
              {problems.length === 0 ? addProblemZone : null}
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
                hideHeader
                sectionMarginBottom={8}
                labels={albumLabels}
                onOpen={(bundleId, pageId) =>
                  router.push({
                    pathname: '/bundle/[id]',
                    params: { id: bundleId, pageId },
                  })
                }
                onLiftItemForDrag={onLiftItemForDrag}
                onHoldMenu={pickMode ? undefined : (item) => enterExportSelect(item)}
                onDragMove={pickMode ? undefined : onDragMove}
                onDragEnd={
                  pickMode
                    ? undefined
                    : (item, moved, pageX, pageY) =>
                        handleItemDragEnd(moved, pageX, pageY, item)
                }
                reorderEnabled={!pickMode}
                onGestureActiveChange={pickMode ? undefined : lockTileGesture}
                onDeleteHold={
                  pickMode
                    ? undefined
                    : (item) => confirmDeleteProblem(item.bundleId, item.pageId)
                }
                selectionMode={pickMode ? 'pick' : null}
                selectedKeys={activeSelectedKeys}
                onToggleSelect={
                  exportSelectMode ? toggleExportSelect : toggleArchiveSelect
                }
              />
            ))
          )}
          <View style={styles.footerAdd}>{addProblemZone}</View>
        </ScrollView>
      </Screen>

      {exportSelectMode ? (
        <View style={[styles.exportBar, { paddingBottom: Math.max(16, insets.bottom) }]}>
          <Button
            label={t('folder.sendToNewFolder')}
            onPress={openNewFolderModal}
            disabled={exportSelectedKeys.size === 0}
          />
          <Button
            label={t('folder.sendToOtherFolder')}
            variant="secondary"
            onPress={openOtherSubjectPicker}
            disabled={exportSelectedKeys.size === 0}
            style={{ marginTop: 8 }}
          />
          <Button
            label={t('common.cancel')}
            variant="ghost"
            onPress={exitExportSelect}
            style={{ marginTop: 8 }}
          />
        </View>
      ) : null}

      {archiveSelectMode ? (
        <View style={[styles.archiveBar, { paddingBottom: Math.max(16, insets.bottom) }]}>
          <Button
            label={t('folder.saveToArchiveCount', { count: archiveSelectedKeys.size })}
            onPress={confirmArchiveSelected}
            disabled={archiveSelectedKeys.size === 0}
          />
          <Button
            label={t('common.cancel')}
            variant="ghost"
            onPress={() => {
              setArchiveSelectMode(false);
              setArchiveSelectedKeys(new Set());
            }}
            style={{ marginTop: 8 }}
          />
        </View>
      ) : null}

      {!exportSelectMode ? (
        <SubjectDropDock currentSubjectId={subject.id} subjects={data.subjects} />
      ) : null}
      <DragMoveGhost pageX={ghost.x} pageY={ghost.y} visible={ghost.visible} />

      <SubjectArchiveModal
        visible={archiveModalOpen}
        subjectId={subject.id}
        subjectName={subject.name}
        onClose={() => setArchiveModalOpen(false)}
      />

      <SendToNewFolderModal
        visible={sendModalOpen}
        title={t('folder.sendToNewFolderTitle')}
        hint={t('folder.sendToNewFolderBulkHint', { count: exportSelectedKeys.size })}
        name={newFolderName}
        placeholder={t('folder.sendToNewFolderPlaceholder')}
        sendLabel={t('common.send')}
        cancelLabel={t('common.cancel')}
        onChangeName={setNewFolderName}
        onSend={confirmSendToNewFolder}
        onClose={() => setSendModalOpen(false)}
      />

      <SubjectPickerModal
        visible={otherPickerOpen}
        title={t('folder.sendToOtherFolderTitle')}
        hint={t('folder.sendToOtherFolderHint')}
        subjects={otherSubjects}
        selectedId={otherSubjectId}
        confirmLabel={t('common.send')}
        cancelLabel={t('common.cancel')}
        onSelect={setOtherSubjectId}
        onConfirm={confirmSendToOtherSubject}
        onClose={() => setOtherPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20 },
  ribbonWrap: { marginBottom: 8, marginHorizontal: -4 },
  exportHint: {
    fontSize: theme.font.caption,
    color: theme.gray,
    textAlign: 'center',
    marginBottom: 8,
  },
  cancelMove: { alignSelf: 'flex-end', marginTop: -12, marginBottom: 8 },
  cancelMoveText: { fontSize: theme.font.caption, fontWeight: '700', color: theme.orange },
  scroll: { paddingHorizontal: 16, paddingBottom: 120 },
  scrollEmpty: { flexGrow: 1, justifyContent: 'center' },
  emptyBlock: { alignItems: 'center', gap: 20, paddingVertical: 40 },
  empty: { fontSize: theme.font.body, color: theme.gray, textAlign: 'center' },
  footerAdd: { marginTop: 24, marginBottom: 8 },
  addZone: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 28,
    borderWidth: 1.5,
    borderColor: theme.grayLight,
    borderStyle: 'dashed',
    borderRadius: theme.radius.md,
    backgroundColor: theme.surface,
  },
  addZonePressed: { opacity: 0.85 },
  addTitle: { fontSize: theme.font.bodySmall, fontWeight: '700', color: theme.orange },
  exportBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: theme.beige,
    borderTopWidth: 1,
    borderTopColor: theme.grayLight,
  },
  archiveBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: theme.beige,
    borderTopWidth: 1,
    borderTopColor: theme.grayLight,
  },
});
