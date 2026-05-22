import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
  type ViewStyle,
} from 'react-native';

import { SubjectFolderTile } from '@/components/files/SubjectFolderTile';
import { theme } from '@/constants/theme';
import type { SubjectPreviewItem } from '@/lib/files/subject-previews';
import type { SubjectFolder } from '@/lib/domain/types';
import { computeVaultFolderTileWidth } from '@/lib/ui/viewport-layout';

const IS_WEB = Platform.OS === 'web';

const webCarouselWrapStyle: ViewStyle | undefined = IS_WEB
  ? ({ cursor: 'grab' as const, touchAction: 'pan-y' } as unknown as ViewStyle)
  : undefined;

const webCarouselListStyle: ViewStyle | undefined = IS_WEB
  ? ({ pointerEvents: 'box-none' } as ViewStyle)
  : undefined;
const DRAG_THRESHOLD = 5;
const RELEASE_ANIM_MS = 380;
const END_DEBOUNCE_MS = 60;
const MIN_SNAP_PX = 3;
const HORIZONTAL_LOCK_PX = 8;
const TILE_GAP = 14;
const PANEL_PAD = 14;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

type Props = {
  pages: SubjectFolder[][];
  pageWidth: number;
  /** 한 페이지 슬롯 수(실제 과목 수보다 많을 수 있음) — 타일 너비 고정용 */
  foldersPerPage: number;
  totalLabelFor: (subjectId: string) => string;
  previewItemsFor: (subjectId: string) => SubjectPreviewItem[];
  onSubjectPress: (subjectId: string) => void;
  swipeHint?: string;
  emptyLabel?: string;
};

export function SubjectFilesCarousel({
  pages,
  pageWidth,
  foldersPerPage,
  totalLabelFor,
  previewItemsFor,
  onSubjectPress,
  swipeHint,
  emptyLabel,
}: Props) {
  const listRef = useRef<FlatList<SubjectFolder[]>>(null);
  const scrollXRef = useRef(0);
  const didDragRef = useRef(false);
  const pointerDragRef = useRef({ active: false, startX: 0, startScroll: 0 });
  const previewGestureLockRef = useRef(false);
  const endHandledAtRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const moveSampleRef = useRef({ x: 0, t: 0, vx: 0 });

  const maxScrollX = useCallback(
    () => Math.max(0, (pages.length - 1) * pageWidth),
    [pageWidth, pages.length]
  );

  const snapOffsetForIndex = useCallback(
    (index: number) => {
      const raw = index * pageWidth;
      return Math.max(0, Math.min(raw, maxScrollX()));
    },
    [maxScrollX, pageWidth]
  );

  const indexFromOffset = useCallback(
    (offsetX: number) => {
      const index = Math.round(offsetX / pageWidth);
      return Math.max(0, Math.min(index, pages.length - 1));
    },
    [pageWidth, pages.length]
  );

  const cancelReleaseAnim = useCallback(() => {
    if (animFrameRef.current != null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  const scrollToOffsetSafe = useCallback(
    (x: number) => {
      if (!listRef.current || pageWidth <= 0) return;
      const clamped = Math.max(0, Math.min(x, maxScrollX()));
      listRef.current.scrollToOffset({ offset: clamped, animated: false });
      scrollXRef.current = clamped;
    },
    [maxScrollX, pageWidth]
  );

  const animateToOffset = useCallback(
    (targetX: number) => {
      cancelReleaseAnim();
      if (!listRef.current || pageWidth <= 0) return;
      const end = Math.max(0, Math.min(targetX, maxScrollX()));
      const start = scrollXRef.current;
      if (Math.abs(end - start) < MIN_SNAP_PX) {
        scrollXRef.current = end;
        return;
      }
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / RELEASE_ANIM_MS);
        const x = start + (end - start) * easeOutCubic(p);
        listRef.current?.scrollToOffset({ offset: x, animated: false });
        scrollXRef.current = x;
        if (p < 1) {
          animFrameRef.current = requestAnimationFrame(tick);
        } else {
          animFrameRef.current = null;
        }
      };
      animFrameRef.current = requestAnimationFrame(tick);
    },
    [cancelReleaseAnim, maxScrollX, pageWidth]
  );

  const finishGesture = useCallback(
    (offsetX: number, velocityPxPerMs = 0) => {
      const now = Date.now();
      if (now - endHandledAtRef.current < END_DEBOUNCE_MS) return;
      endHandledAtRef.current = now;

      const projected = offsetX + velocityPxPerMs * 200;
      const index = indexFromOffset(projected);
      animateToOffset(snapOffsetForIndex(index));
    },
    [animateToOffset, indexFromOffset, snapOffsetForIndex]
  );

  const endPointerDrag = useCallback(() => {
    if (!pointerDragRef.current.active) return;
    pointerDragRef.current.active = false;
    finishGesture(scrollXRef.current, moveSampleRef.current.vx);
    didDragRef.current = false;
  }, [finishGesture]);

  const movePointer = useCallback(
    (pageX: number) => {
      if (!pointerDragRef.current.active) return;
      const t = performance.now();
      const dt = Math.max(1, t - moveSampleRef.current.t);
      moveSampleRef.current.vx = (moveSampleRef.current.x - pageX) / dt;
      moveSampleRef.current.x = pageX;
      moveSampleRef.current.t = t;

      const dx = pointerDragRef.current.startX - pageX;
      if (Math.abs(dx) > DRAG_THRESHOLD) didDragRef.current = true;
      scrollToOffsetSafe(pointerDragRef.current.startScroll + dx);
    },
    [scrollToOffsetSafe]
  );

  const setPreviewGestureLock = useCallback((locked: boolean) => {
    previewGestureLockRef.current = locked;
  }, []);

  const startPointerDrag = useCallback(
    (pageX: number) => {
      if (previewGestureLockRef.current) return;
      cancelReleaseAnim();
      didDragRef.current = false;
      endHandledAtRef.current = 0;
      const t0 = performance.now();
      moveSampleRef.current = { x: pageX, t: t0, vx: 0 };
      pointerDragRef.current = {
        active: true,
        startX: pageX,
        startScroll: scrollXRef.current,
      };
    },
    [cancelReleaseAnim]
  );

  useEffect(() => () => cancelReleaseAnim(), [cancelReleaseAnim]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollXRef.current = e.nativeEvent.contentOffset.x;
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) =>
          !previewGestureLockRef.current &&
          Math.abs(g.dx) > HORIZONTAL_LOCK_PX &&
          Math.abs(g.dx) > Math.abs(g.dy) * 1.15,
        onMoveShouldSetPanResponderCapture: (_, g) =>
          !previewGestureLockRef.current &&
          Math.abs(g.dx) > HORIZONTAL_LOCK_PX &&
          Math.abs(g.dx) > Math.abs(g.dy) * 1.15,
        onPanResponderGrant: (evt) => startPointerDrag(evt.nativeEvent.pageX),
        onPanResponderMove: (evt) => movePointer(evt.nativeEvent.pageX),
        onPanResponderRelease: endPointerDrag,
        onPanResponderTerminate: endPointerDrag,
      }),
    [endPointerDrag, movePointer, startPointerDrag]
  );

  const bindWebMouseDrag = useCallback(
    (pageX: number) => {
      if (typeof document === 'undefined' || previewGestureLockRef.current) return;
      startPointerDrag(pageX);
      const onMove = (ev: MouseEvent) => movePointer(ev.pageX);
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        endPointerDrag();
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [endPointerDrag, movePointer, startPointerDrag]
  );

  const tileWidth = useMemo(
    () => computeVaultFolderTileWidth(pageWidth, foldersPerPage),
    [pageWidth, foldersPerPage]
  );

  const handleSubjectPress = useCallback(
    (subjectId: string) => {
      if (didDragRef.current) return;
      onSubjectPress(subjectId);
    },
    [onSubjectPress]
  );

  const renderPage = ({ item: row }: ListRenderItemInfo<SubjectFolder[]>) => (
    <View style={[styles.page, { width: pageWidth }]}>
      <View style={styles.row}>
        {row.map((subject) => (
          <View key={subject.id} style={[styles.tileSlot, { width: tileWidth }]}>
            <SubjectFolderTile
              subjectId={subject.id}
              name={subject.name}
              totalLabel={totalLabelFor(subject.id)}
              previewItems={previewItemsFor(subject.id)}
              onPreviewGestureLock={setPreviewGestureLock}
              onPress={() => handleSubjectPress(subject.id)}
            />
          </View>
        ))}
      </View>
    </View>
  );

  if (pages.length === 0) {
    return emptyLabel ? <Text style={styles.empty}>{emptyLabel}</Text> : null;
  }

  if (pageWidth <= 0) return null;

  return (
    <>
      <View
        style={[styles.wrap, webCarouselWrapStyle]}
        {...(!IS_WEB ? panResponder.panHandlers : {})}
        {...(IS_WEB
          ? {
              onMouseDown: (e: { button?: number; nativeEvent: { pageX: number } }) => {
                if (e.button !== undefined && e.button !== 0) return;
                bindWebMouseDrag(e.nativeEvent.pageX);
              },
              onTouchStart: (e: { nativeEvent: { touches: { pageX: number }[] } }) => {
                const t = e.nativeEvent.touches[0];
                if (t) startPointerDrag(t.pageX);
              },
              onTouchMove: (e: { nativeEvent: { touches: { pageX: number }[] } }) => {
                const t = e.nativeEvent.touches[0];
                if (t) movePointer(t.pageX);
              },
              onTouchEnd: endPointerDrag,
              onTouchCancel: endPointerDrag,
            }
          : {})}>
        <FlatList
          ref={listRef}
          data={pages}
          horizontal
          scrollEnabled={false}
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, index) => `files-page-${index}`}
          renderItem={renderPage}
          scrollEventThrottle={16}
          onScroll={onScroll}
          getItemLayout={(_, index) => ({
            length: pageWidth,
            offset: pageWidth * index,
            index,
          })}
          style={webCarouselListStyle}
        />
      </View>
      {pages.length > 1 && swipeHint ? <Text style={styles.swipeHint}>{swipeHint}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  page: {
    paddingHorizontal: PANEL_PAD,
  },
  row: {
    flexDirection: 'row',
    gap: TILE_GAP,
    alignItems: 'flex-start',
  },
  tileSlot: {
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 0,
  },
  empty: {
    paddingHorizontal: PANEL_PAD,
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.gray,
    textAlign: 'center',
    paddingVertical: 32,
  },
  swipeHint: {
    marginTop: 10,
    paddingHorizontal: PANEL_PAD,
    fontSize: theme.font.caption,
    fontWeight: '600',
    color: theme.grayMuted,
    textAlign: 'center',
  },
});
