import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { SubjectFolderTile } from '@/components/files/SubjectFolderTile';
import { SubjectReorderInsertLine } from '@/components/files/SubjectReorderInsertLine';
import { VaultAddFolderTile } from '@/components/files/VaultAddFolderTile';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import type { SubjectPreviewItem } from '@/lib/files/subject-previews';
import type { SubjectFolder } from '@/lib/domain/types';
import { computeVaultFolderTileWidth } from '@/lib/ui/viewport-layout';

const TILE_GAP = 14;
const PANEL_PAD = 14;
const REORDER_EDGE_PX = 52;
const REORDER_SCROLL_STEP = 22;

type Props = {
  pages: SubjectFolder[][];
  pageWidth: number;
  foldersPerPage: number;
  totalLabelFor: (subjectId: string) => string;
  previewItemsFor: (subjectId: string) => SubjectPreviewItem[];
  onSubjectPress: (subjectId: string) => void;
  onSubjectLift: (subjectId: string) => void;
  onSubjectReorderMove: (pageX: number, pageY: number) => void;
  onSubjectReorderEnd: (
    subjectId: string,
    subjectName: string,
    moved: boolean,
    pageX: number,
    pageY: number
  ) => void;
  emptyLabel?: string;
  onFolderGestureLock?: (locked: boolean) => void;
  onSubjectDeleteHold?: (subjectId: string, subjectName: string) => void;
  onAddFolder?: () => void;
  addFolderLabel?: string;
  subjectDeleteMode?: boolean;
  selectedSubjectIds?: Set<string>;
  onToggleSubjectDelete?: (subjectId: string) => void;
};

export function SubjectFilesCarousel({
  pages,
  pageWidth,
  foldersPerPage,
  totalLabelFor,
  previewItemsFor,
  onSubjectPress,
  onSubjectLift,
  onSubjectReorderMove,
  onSubjectReorderEnd,
  emptyLabel,
  onFolderGestureLock,
  onSubjectDeleteHold,
  onAddFolder,
  addFolderLabel,
  subjectDeleteMode = false,
  selectedSubjectIds,
  onToggleSubjectDelete,
}: Props) {
  const listRef = useRef<FlatList<SubjectFolder>>(null);
  const panelRef = useRef<View | null>(null);
  const scrollXRef = useRef(0);
  const panelBoundsRef = useRef({ left: 0, right: 0 });
  const dragPageXRef = useRef(0);
  const autoScrollRafRef = useRef<number | null>(null);
  const maxScrollXRef = useRef(0);
  const [listScrollEnabled, setListScrollEnabled] = useState(true);

  const { reorderingSubjectId, bumpSubjectReorderMeasure } = useApp();

  const subjects = useMemo(() => pages.flat(), [pages]);

  const tileWidth = useMemo(
    () => computeVaultFolderTileWidth(pageWidth, foldersPerPage),
    [pageWidth, foldersPerPage]
  );

  const slotWidth = tileWidth + TILE_GAP;

  const slotCount = subjects.length + (onAddFolder ? 1 : 0);

  const updateMaxScroll = useCallback(() => {
    maxScrollXRef.current = Math.max(0, slotCount * slotWidth - pageWidth + PANEL_PAD * 2);
  }, [pageWidth, slotCount, slotWidth]);

  useEffect(() => {
    updateMaxScroll();
  }, [updateMaxScroll]);

  const setPreviewGestureLock = useCallback(
    (locked: boolean) => {
      onFolderGestureLock?.(locked);
      const canScroll = slotCount > 1 && !locked && !reorderingSubjectId;
      setListScrollEnabled(canScroll);
    },
    [onFolderGestureLock, reorderingSubjectId, slotCount]
  );

  const measurePanelBounds = useCallback(() => {
    panelRef.current?.measureInWindow((x, _y, width) => {
      panelBoundsRef.current = { left: x, right: x + width };
    });
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRafRef.current != null) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
  }, []);

  const scrollToX = useCallback((x: number) => {
    const clamped = Math.max(0, Math.min(x, maxScrollXRef.current));
    listRef.current?.scrollToOffset({ offset: clamped, animated: false });
    scrollXRef.current = clamped;
  }, []);

  const scrollAtEdge = useCallback(
    (pageX: number) => {
      const { left, right } = panelBoundsRef.current;
      if (right <= left) return;
      let next = scrollXRef.current;
      if (pageX < left + REORDER_EDGE_PX) next -= REORDER_SCROLL_STEP;
      else if (pageX > right - REORDER_EDGE_PX) next += REORDER_SCROLL_STEP;
      else return;
      scrollToX(next);
      bumpSubjectReorderMeasure();
    },
    [bumpSubjectReorderMeasure, scrollToX]
  );

  const tickAutoScroll = useCallback(() => {
    if (!reorderingSubjectId) {
      stopAutoScroll();
      return;
    }
    scrollAtEdge(dragPageXRef.current);
    autoScrollRafRef.current = requestAnimationFrame(tickAutoScroll);
  }, [reorderingSubjectId, scrollAtEdge, stopAutoScroll]);

  const handleReorderDragMove = useCallback(
    (pageX: number, pageY: number) => {
      dragPageXRef.current = pageX;
      onSubjectReorderMove(pageX, pageY);
      const { left, right } = panelBoundsRef.current;
      const atEdge =
        right > left &&
        (pageX < left + REORDER_EDGE_PX || pageX > right - REORDER_EDGE_PX);
      if (atEdge && autoScrollRafRef.current == null) {
        autoScrollRafRef.current = requestAnimationFrame(tickAutoScroll);
      } else if (!atEdge) {
        stopAutoScroll();
      }
    },
    [onSubjectReorderMove, stopAutoScroll, tickAutoScroll]
  );

  useEffect(() => () => stopAutoScroll(), [stopAutoScroll]);

  useEffect(() => {
    if (!reorderingSubjectId) {
      stopAutoScroll();
      setListScrollEnabled(slotCount > 1);
      return;
    }
    measurePanelBounds();
    setListScrollEnabled(false);
    const idx = subjects.findIndex((s) => s.id === reorderingSubjectId);
    if (idx >= 0) {
      scrollToX(Math.max(0, idx * slotWidth - PANEL_PAD));
    }
    bumpSubjectReorderMeasure();
  }, [
    bumpSubjectReorderMeasure,
    measurePanelBounds,
    reorderingSubjectId,
    scrollToX,
    slotWidth,
    stopAutoScroll,
    subjects,
    slotCount,
  ]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollXRef.current = e.nativeEvent.contentOffset.x;
    if (reorderingSubjectId) bumpSubjectReorderMeasure();
  };

  const renderItem = ({ item: subject }: ListRenderItemInfo<SubjectFolder>) => (
    <View style={[styles.tileSlot, { width: tileWidth, marginRight: TILE_GAP }]}>
      <SubjectFolderTile
        subjectId={subject.id}
        name={subject.name}
        totalLabel={totalLabelFor(subject.id)}
        previewItems={previewItemsFor(subject.id)}
        onPreviewGestureLock={setPreviewGestureLock}
        onPress={() => onSubjectPress(subject.id)}
        onLiftForReorder={() => onSubjectLift(subject.id)}
        onReorderDragMove={handleReorderDragMove}
        onReorderDragEnd={(moved, pageX, pageY) => {
          stopAutoScroll();
          onSubjectReorderEnd(subject.id, subject.name, moved, pageX, pageY);
        }}
        onDeleteHold={
          subjectDeleteMode || !onSubjectDeleteHold
            ? undefined
            : () => onSubjectDeleteHold(subject.id, subject.name)
        }
        selectionMode={subjectDeleteMode}
        selected={selectedSubjectIds?.has(subject.id) ?? false}
        onToggleSelect={
          onToggleSubjectDelete ? () => onToggleSubjectDelete(subject.id) : undefined
        }
      />
    </View>
  );

  if (pageWidth <= 0 || tileWidth <= 0) return null;

  const addFolderTile =
    onAddFolder && addFolderLabel ? (
      <View style={[styles.tileSlot, { width: tileWidth, marginRight: TILE_GAP }]}>
        <VaultAddFolderTile width={tileWidth} label={addFolderLabel} onPress={onAddFolder} />
      </View>
    ) : null;

  return (
    <View ref={panelRef} onLayout={measurePanelBounds} style={styles.wrap}>
      <SubjectReorderInsertLine panelRef={panelRef} />
      <FlatList
        ref={listRef}
        data={subjects}
        horizontal
        scrollEnabled={listScrollEnabled}
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        scrollEventThrottle={16}
        onScroll={onScroll}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={addFolderTile}
        getItemLayout={(_, index) => ({
          length: slotWidth,
          offset: slotWidth * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    position: 'relative',
  },
  listContent: {
    paddingHorizontal: PANEL_PAD,
  },
  tileSlot: {
    flexGrow: 0,
    flexShrink: 0,
  },
  empty: {
    paddingHorizontal: PANEL_PAD,
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.gray,
    textAlign: 'center',
    paddingVertical: 32,
  },
});
