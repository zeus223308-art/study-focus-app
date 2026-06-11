import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BulkTagModal } from '@/components/files/BulkTagModal';
import { DateAlbumSection } from '@/components/files/DateAlbumSection';
import { DragMoveGhost } from '@/components/files/DragMoveGhost';
import { FolderPhotoActionBar } from '@/components/files/FolderPhotoActionBar';
import { SendToNewFolderModal } from '@/components/files/SendToNewFolderModal';
import { SubjectArchiveHeaderButton } from '@/components/files/SubjectArchiveHeaderButton';
import { SubjectArchiveModal } from '@/components/files/SubjectArchiveModal';
import { SubjectDropDock } from '@/components/files/SubjectDropDock';
import { SubjectPickerModal } from '@/components/files/SubjectPickerModal';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useApp, useLanguage } from '@/context/AppContext';
import { mergeCaptureTagPresets } from '@/lib/domain/capture-tags';
import type { PageRef } from '@/lib/domain/move-pages-batch';
import {
  groupSubjectProblemsByDate,
  listSubjectProblems,
  type SubjectProblemItem,
} from '@/lib/grouping/bundles';
import { remainingPhotoSlots } from '@/services/storage';
import { confirmChoice, showMessage } from '@/lib/ui/confirm';
import { NotFoundView } from '@/components/ui/NotFoundView';
import { ALBUM_TILE_GAP, SCREEN_HORIZONTAL_PAD, useViewportLayout } from '@/lib/ui/viewport-layout';

function itemKey(item: SubjectProblemItem) {
  return `${item.bundleId}:${item.pageId}`;
}

function keysToPageRefs(keys: Set<string>): PageRef[] {
  return [...keys].map((key) => {
    const [bundleId, pageId] = key.split(':');
    return { bundleId: bundleId!, pageId: pageId! };
  });
}

function normalizeRouteId(id: string | string[] | undefined): string {
  if (Array.isArray(id)) return id[0] ?? '';
  return id ?? '';
}

export default function FolderScreen() {
  const { id: rawId, studyDate: studyDateParam } = useLocalSearchParams<{
    id: string;
    studyDate?: string;
  }>();
  const subjectId = normalizeRouteId(rawId);
  const { t } = useTranslation();
  const router = useRouter();
  const { language } = useLanguage();
  const {
    data,
    localToday,
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
    updateBundle,
    updateSettings,
    setTagColorFor,
    removeCaptureTag,
    setPaywallVisible,
    setActiveFolderCapture,
  } = useApp();
  const [albumFilterDate, setAlbumFilterDate] = useState(localToday);
  const [ghost, setGhost] = useState({ x: 0, y: 0, visible: false });
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [otherPickerOpen, setOtherPickerOpen] = useState(false);
  const [otherSubjectId, setOtherSubjectId] = useState<string | null>(null);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [photoSelectMode, setPhotoSelectMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [bulkTagOpen, setBulkTagOpen] = useState(false);
  const [tileGestureActive, setTileGestureActive] = useState(false);
  const viewport = useViewportLayout();
  const insets = useSafeAreaInsets();

  const subject = data.subjects.find((s) => s.id === subjectId);
  const problems = useMemo(
    () => listSubjectProblems(data.bundles, subjectId, subject?.itemOrder),
    [data.bundles, subjectId, subject?.itemOrder]
  );
  useEffect(() => {
    if (typeof studyDateParam === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(studyDateParam)) {
      setAlbumFilterDate(studyDateParam);
      return;
    }
    setAlbumFilterDate(localToday);
  }, [subjectId, localToday, studyDateParam]);

  useEffect(() => {
    if (!subject?.id) return;
    setActiveFolderCapture({ subjectId: subject.id, studyDate: albumFilterDate });
  }, [subject?.id, albumFilterDate, setActiveFolderCapture]);

  const dateSections = useMemo(
    () => groupSubjectProblemsByDate(problems),
    [problems]
  );

  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<string, number>>({});

  const scrollToDate = useCallback((dateKey: string) => {
    const offsets = sectionOffsets.current;
    let target = offsets[dateKey];
    if (target == null) {
      // Sections are newest-first; jump to the closest date at or before the pick.
      const dates = Object.keys(offsets).sort((a, b) => b.localeCompare(a));
      const fallback = dates.find((d) => d <= dateKey) ?? dates[dates.length - 1];
      if (fallback != null) target = offsets[fallback];
    }
    if (target != null) {
      scrollRef.current?.scrollTo({ y: Math.max(0, target - 8), animated: true });
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => scrollToDate(albumFilterDate), 0);
    return () => clearTimeout(id);
  }, [albumFilterDate, scrollToDate, dateSections.length]);

  const pickMode = photoSelectMode;
  const selectedCount = selectedKeys.size;

  const tagPresets = useMemo(
    () => data.settings.captureTagPresets ?? [],
    [data.settings.captureTagPresets]
  );

  const isPro = data.settings.tier === 'pro';

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
    }),
    [t]
  );

  const exitPhotoSelect = useCallback(() => {
    setPhotoSelectMode(false);
    setSelectedKeys(new Set());
    setBulkTagOpen(false);
  }, []);

  const enterPhotoSelect = useCallback((item: SubjectProblemItem) => {
    setPhotoSelectMode(true);
    setSelectedKeys(new Set([itemKey(item)]));
  }, []);

  const togglePhotoSelect = useCallback((item: SubjectProblemItem) => {
    const key = itemKey(item);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const openCaptureFlow = () => {
    if (!subject || pickMode) return;
    if (remainingPhotoSlots(data) <= 0) {
      setPaywallVisible(true);
      return;
    }
    setActiveFolderCapture({
      subjectId: subject.id,
      studyDate: albumFilterDate,
    });
    router.push('/(tabs)/capture?entry=import&fresh=1');
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

  const confirmArchiveSelected = () => {
    if (selectedKeys.size === 0) return;
    const bundleIds = new Set<string>();
    for (const key of selectedKeys) {
      bundleIds.add(key.split(':')[0]!);
    }
    for (const bid of bundleIds) {
      archiveBundle(bid);
    }
    exitPhotoSelect();
    showMessage('', t('folder.archivedCount', { count: bundleIds.size }));
  };

  const confirmDeleteSelected = () => {
    if (selectedKeys.size === 0) return;
    confirmChoice({
      title: t('folder.deleteSelectedTitle'),
      message: t('folder.deleteSelectedMessage', { count: selectedKeys.size }),
      yesLabel: t('common.yes'),
      noLabel: t('common.no'),
      onYes: () => {
        const items = keysToPageRefs(selectedKeys);
        for (const { bundleId, pageId } of items) {
          deletePage(bundleId, pageId);
        }
        exitPhotoSelect();
      },
    });
  };

  const applyBulkTags = useCallback(
    (tags: string[]) => {
      const trimmed = tags.map((tag) => tag.trim()).filter(Boolean);
      if (trimmed.length === 0 || selectedKeys.size === 0) return;

      const byBundle = new Map<string, Set<string>>();
      for (const key of selectedKeys) {
        const [bundleId, pageId] = key.split(':');
        if (!bundleId || !pageId) continue;
        if (!byBundle.has(bundleId)) byBundle.set(bundleId, new Set());
        byBundle.get(bundleId)!.add(pageId);
      }

      for (const [bundleId, pageIds] of byBundle) {
        const bundle = data.bundles.find((b) => b.id === bundleId);
        if (!bundle) continue;
        updateBundle(bundleId, {
          pages: bundle.pages.map((page) => {
            if (!pageIds.has(page.id)) return page;
            const merged = [...(page.tags ?? []), ...trimmed];
            const unique = [...new Set(merged.map((tag) => tag.trim()).filter(Boolean))];
            return { ...page, tags: unique };
          }),
        });
      }

      setBulkTagOpen(false);
      const count = selectedKeys.size;
      exitPhotoSelect();
      showMessage('', t('folder.bulkTagDone', { count }));
    },
    [data.bundles, exitPhotoSelect, selectedKeys, t, updateBundle]
  );

  const addTagPreset = useCallback(
    (label: string) => {
      updateSettings({
        captureTagPresets: mergeCaptureTagPresets(
          data.settings.captureTagPresets,
          data.settings.language,
          label
        ),
      });
    },
    [data.settings.captureTagPresets, data.settings.language, updateSettings]
  );

  const lockTileGesture = useCallback((active: boolean) => {
    setTileGestureActive(active);
  }, []);

  const openNewFolderModal = () => {
    if (selectedKeys.size === 0) return;
    setNewFolderName('');
    setSendModalOpen(true);
  };

  const confirmSendToNewFolder = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed || selectedKeys.size === 0) return;

    const items = keysToPageRefs(selectedKeys);
    const newSubjectId = moveProblemsToNewSubject(items, trimmed);
    setSendModalOpen(false);
    exitPhotoSelect();

    if (!newSubjectId) return;
    showMessage('', t('folder.sendToNewFolderDone', { name: trimmed }));
    router.replace({ pathname: '/folder/[id]', params: { id: newSubjectId } });
  };

  const openOtherSubjectPicker = () => {
    if (selectedKeys.size === 0) return;
    setOtherSubjectId(null);
    setOtherPickerOpen(true);
  };

  const confirmSendToOtherSubject = () => {
    if (!otherSubjectId || selectedKeys.size === 0) return;
    const items = keysToPageRefs(selectedKeys);
    const ok = moveProblemsToSubject(items, otherSubjectId);
    setOtherPickerOpen(false);
    exitPhotoSelect();
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

  const albumScrollEnabled = !movingBundleId && !tileGestureActive;

  if (!subject) {
    return (
      <Screen>
        <NotFoundView backFallback="/(tabs)/vault" />
      </Screen>
    );
  }

  const addProblemZone = (
    <Pressable
      onPress={openCaptureFlow}
      disabled={pickMode}
      style={({ pressed }) => [styles.addZone, pressed && styles.addZonePressed]}
      accessibilityLabel={t('folder.addProblem')}>
      <SymbolView
        name={{ ios: 'plus.circle.fill', android: 'add', web: 'add' }}
        size={28}
        tintColor={theme.orange}
      />
      <Text style={styles.addTitle}>{t('folder.addProblem')}</Text>
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <Screen padded={false} fill>
        <View style={[styles.header, styles.shrink0]}>
          <ScreenHeader
            title={subject.name}
            showBack
            backFallback="/(tabs)/vault"
            showSettings={false}
            right={
              <View style={styles.headerActions}>
                <SubjectArchiveHeaderButton
                  label={t('folder.archive')}
                  onPress={() => setArchiveModalOpen(true)}
                />
              </View>
            }
          />
          {photoSelectMode ? (
            <Text style={styles.exportHint}>{t('folder.selectHint')}</Text>
          ) : null}
          {movingBundleId && (
            <Pressable onPress={cancelMovingBundle} style={styles.cancelMove}>
              <Text style={styles.cancelMoveText}>{t('common.cancel')}</Text>
            </Pressable>
          )}
        </View>
        <ScrollView
          ref={scrollRef}
          style={styles.albumScroll}
          scrollEnabled={albumScrollEnabled}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          contentContainerStyle={[
            styles.scroll,
            photoSelectMode && styles.scrollSelecting,
            problems.length === 0 && styles.scrollEmpty,
            viewport.isTablet && {
              maxWidth: viewport.contentMaxWidth,
              alignSelf: 'center',
              width: '100%',
            },
          ]}>
          {dateSections.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Text style={styles.empty}>{t('folder.empty')}</Text>
            </View>
          ) : (
            dateSections.map((section) => (
              <View
                key={section.studyDate}
                onLayout={(e) => {
                  sectionOffsets.current[section.studyDate] = e.nativeEvent.layout.y;
                }}>
                <DateAlbumSection
                  section={section}
                  language={language}
                  subjectId={subject.id}
                  albumColumns={viewport.albumNumColumns}
                  contentWidth={albumContentWidth}
                  gap={ALBUM_TILE_GAP}
                  sectionMarginBottom={18}
                  labels={albumLabels}
                  onOpen={(bundleId, pageId) =>
                    router.push({
                      pathname: '/bundle/[id]',
                      params: { id: bundleId, pageId },
                    })
                  }
                  onLiftItemForDrag={onLiftItemForDrag}
                  onHoldMenu={pickMode ? undefined : (item) => enterPhotoSelect(item)}
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
                  selectedKeys={selectedKeys}
                  onToggleSelect={togglePhotoSelect}
                />
              </View>
            ))
          )}
          <View style={styles.footerAdd}>{addProblemZone}</View>
        </ScrollView>
      </Screen>

      {photoSelectMode ? (
        <View style={[styles.exportBar, { paddingBottom: Math.max(12, insets.bottom) }]}>
          <FolderPhotoActionBar
            actions={[
              {
                key: 'delete',
                label: t('folder.deleteSelected', { count: selectedCount }),
                variant: 'secondary',
                onPress: confirmDeleteSelected,
                disabled: selectedCount === 0,
              },
              {
                key: 'archive',
                label: t('folder.saveToArchiveCount', { count: selectedCount }),
                variant: 'secondary',
                onPress: confirmArchiveSelected,
                disabled: selectedCount === 0,
              },
              {
                key: 'tag',
                label: t('folder.tagSelected', { count: selectedCount }),
                variant: 'secondary',
                onPress: () => setBulkTagOpen(true),
                disabled: selectedCount === 0,
              },
            ]}
          />
          <FolderPhotoActionBar
            actions={[
              {
                key: 'new',
                label: t('folder.sendToNewFolder'),
                onPress: openNewFolderModal,
                disabled: selectedCount === 0,
              },
              {
                key: 'other',
                label: t('folder.sendToOtherFolder'),
                variant: 'secondary',
                onPress: openOtherSubjectPicker,
                disabled: selectedCount === 0,
              },
              {
                key: 'cancel',
                label: t('common.cancel'),
                variant: 'ghost',
                onPress: exitPhotoSelect,
              },
            ]}
          />
        </View>
      ) : null}

      {!photoSelectMode ? (
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
        hint={t('folder.sendToNewFolderBulkHint', { count: selectedCount })}
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

      <BulkTagModal
        visible={bulkTagOpen}
        photoCount={selectedCount}
        language={language}
        presets={tagPresets}
        tagColors={data.settings.tagColors}
        tagColorFallback={data.settings.tagColor}
        isPro={isPro}
        onRequirePremium={() => setPaywallVisible(true)}
        onAddPreset={addTagPreset}
        onRemovePreset={removeCaptureTag}
        onSetTagColor={setTagColorFor}
        onApply={applyBulkTags}
        onClose={() => setBulkTagOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  shrink0: { flexShrink: 0 },
  header: { paddingHorizontal: SCREEN_HORIZONTAL_PAD },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exportHint: {
    fontSize: theme.font.caption,
    color: theme.gray,
    textAlign: 'center',
    marginBottom: 8,
  },
  cancelMove: { alignSelf: 'flex-end', marginTop: -12, marginBottom: 8 },
  cancelMoveText: { fontSize: theme.font.caption, fontWeight: '700', color: theme.orange },
  albumScroll: { flex: 1, minHeight: 0 },
  scroll: { paddingHorizontal: SCREEN_HORIZONTAL_PAD, paddingBottom: 120 },
  scrollSelecting: { paddingBottom: 200 },
  scrollEmpty: { flexGrow: 1, justifyContent: 'center' },
  emptyBlock: { alignItems: 'center', gap: 20, paddingVertical: 40 },
  empty: { fontSize: theme.font.body, color: theme.gray, textAlign: 'center' },
  footerAdd: { marginTop: 24, marginBottom: 8 },
  addZone: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 28,
    borderWidth: 1,
    borderColor: theme.grayLight,
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
    paddingTop: 8,
    alignItems: 'center',
    backgroundColor: theme.beige,
    borderTopWidth: 1,
    borderTopColor: theme.grayLight,
  },
  archiveBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 8,
    alignItems: 'center',
    backgroundColor: theme.beige,
    borderTopWidth: 1,
    borderTopColor: theme.grayLight,
  },
});
