import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { SubjectFolderTile } from '@/components/files/SubjectFolderTile';
import { SubjectReorderGap } from '@/components/files/SubjectReorderGap';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import type { SubjectPreviewItem } from '@/lib/files/subject-previews';
import type { SubjectFolder } from '@/lib/domain/types';
import {
  VAULT_PANEL_PAD,
  VAULT_TILE_GAP,
  computeVaultFolderTileWidth,
  vaultCarouselItemOffset,
  vaultCarouselScrollWidth,
} from '@/lib/ui/viewport-layout';
import { resolveWebElement } from '@/lib/ui/resolve-web-element';
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
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollDomRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<View>(null);
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

  const bindScrollDom = useCallback((node: ScrollView | null) => {
    scrollRef.current = node;
    scrollDomRef.current = resolveWebElement(node);
  }, []);

  const updateMaxScroll = useCallback(() => {
    const content = vaultCarouselScrollWidth(subjects.length, tileWidth);
    maxScrollXRef.current = Math.max(0, content - pageWidth + VAULT_PANEL_PAD * 2);
    const dom = scrollDomRef.current;
    if (dom) {
      dom.style.overflowX = listScrollEnabled ? 'auto' : 'hidden';
      dom.style.touchAction =
        reorderingSubjectId ? 'none' : 'pan-x';
    }
  }, [listScrollEnabled, pageWidth, reorderingSubjectId, subjects.length, tileWidth]);

  useEffect(() => {
    updateMaxScroll();
  }, [updateMaxScroll]);

  const setPreviewGestureLock = useCallback(
    (locked: boolean) => {
      onFolderGestureLock?.(locked);
      setListScrollEnabled(
        subjects.length > 1 && !locked && !reorderingSubjectId
      );
    },
    [onFolderGestureLock, reorderingSubjectId, subjects.length]
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
    const dom = scrollDomRef.current;
    if (dom) {
      dom.scrollLeft = clamped;
    } else {
      scrollRef.current?.scrollTo({ x: clamped, animated: false });
    }
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
      setListScrollEnabled(subjects.length > 1);
      return;
    }
    measurePanelBounds();
    setListScrollEnabled(false);
    const idx = subjects.findIndex((s) => s.id === reorderingSubjectId);
    if (idx >= 0) {
      scrollToX(Math.max(0, vaultCarouselItemOffset(idx, tileWidth) - VAULT_PANEL_PAD));
    }
    bumpSubjectReorderMeasure();
  }, [
    bumpSubjectReorderMeasure,
    measurePanelBounds,
    reorderingSubjectId,
    scrollToX,
    stopAutoScroll,
    subjects,
    tileWidth,
  ]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollXRef.current = e.nativeEvent.contentOffset.x;
    if (reorderingSubjectId) bumpSubjectReorderMeasure();
  };

  if (subjects.length === 0) {
    return emptyLabel ? <Text style={styles.empty}>{emptyLabel}</Text> : null;
  }

  if (pageWidth <= 0 || tileWidth <= 0) return null;

  const carouselMode =
    reorderingSubjectId ? 'reorder' : 'scroll';

  return (
    <View
      ref={panelRef}
      onLayout={measurePanelBounds}
      style={styles.wrap}
      {...({ 'data-subject-carousel': carouselMode } as object)}>
      <ScrollView
        ref={bindScrollDom}
        horizontal
        scrollEnabled={listScrollEnabled}
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.scroller}
        contentContainerStyle={styles.row}>
        {subjects.map((subject, index) => (
          <View key={subject.id} style={styles.rowSlot}>
            {index > 0 ? <SubjectReorderGap gapIndex={index} width={VAULT_TILE_GAP} /> : null}
            <View style={[styles.tileSlot, { width: tileWidth }]}>
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
              />
            </View>
          </View>
        ))}
        {subjects.length > 0 ? (
          <SubjectReorderGap gapIndex={subjects.length} width={VAULT_TILE_GAP} />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
  },
  scroller: {
    width: '100%',
    overflowX: 'auto',
    overflowY: 'hidden',
    WebkitOverflowScrolling: 'touch',
    touchAction: 'pan-x',
  } as ViewStyle,
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: VAULT_PANEL_PAD,
  },
  rowSlot: {
    flexDirection: 'row',
    alignItems: 'stretch',
    flexGrow: 0,
    flexShrink: 0,
  },
  tileSlot: {
    flexGrow: 0,
    flexShrink: 0,
  },
  empty: {
    paddingHorizontal: VAULT_PANEL_PAD,
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.gray,
    textAlign: 'center',
    paddingVertical: 32,
  },
});
