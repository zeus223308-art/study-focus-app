import { format } from 'date-fns';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import { SpringPressable } from '@/components/ui/SpringPressable';
import { theme } from '@/constants/theme';
import { buildRibbonDays } from '@/lib/domain/dates';
import type { DateRibbonMark } from '@/lib/domain/types';
const CHIP_WIDTH = 56;
const CHIP_GAP = 10;
const RIBBON_DAY_STRIDE = CHIP_WIDTH + CHIP_GAP;
const IS_WEB = Platform.OS === 'web';

const webWrapStyle: ViewStyle | undefined = IS_WEB
  ? ({ cursor: 'grab' as const, touchAction: 'pan-y' } as unknown as ViewStyle)
  : undefined;

const webListStyle: ViewStyle | undefined = IS_WEB
  ? ({ pointerEvents: 'box-none' } as ViewStyle)
  : undefined;
const DRAG_THRESHOLD = 5;
const RELEASE_ANIM_MS = 400;
const END_DEBOUNCE_MS = 60;
const MIN_SNAP_PX = 3;
const HORIZONTAL_LOCK_PX = 8;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

type DayItem = { key: string; date: Date };

type Props = {
  marks: DateRibbonMark[];
  selectedDate: string;
  firstLaunchDate: string;
  localToday: string;
  onSelectDate: (date: string) => void;
};

export function DateRibbon({ marks, selectedDate, firstLaunchDate, localToday, onSelectDate }: Props) {
  const listRef = useRef<FlatList<DayItem>>(null);
  const [listWidth, setListWidth] = useState(0);
  const scrollXRef = useRef(0);
  const contentWidthRef = useRef(0);
  const didDragRef = useRef(false);
  const pointerDragRef = useRef({ active: false, startX: 0, startScroll: 0 });
  const endHandledAtRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const moveSampleRef = useRef({ x: 0, t: 0, vx: 0 });
  const selectedRef = useRef(selectedDate);
  selectedRef.current = selectedDate;

  const todayStr = localToday;

  const days = useMemo<DayItem[]>(
    () =>
      buildRibbonDays(firstLaunchDate).map((date) => ({
        key: format(date, 'yyyy-MM-dd'),
        date,
      })),
    [firstLaunchDate, localToday]
  );

  const sidePad = Math.max(0, (listWidth - CHIP_WIDTH) / 2);

  const estimatedContentWidth = useMemo(
    () => sidePad * 2 + days.length * RIBBON_DAY_STRIDE,
    [days.length, sidePad]
  );

  const indexForDate = useCallback(
    (dateKey: string) => days.findIndex((d) => d.key === dateKey),
    [days]
  );

  const maxScrollX = useCallback(() => {
    const contentW = contentWidthRef.current > 0 ? contentWidthRef.current : estimatedContentWidth;
    return Math.max(0, contentW - listWidth);
  }, [estimatedContentWidth, listWidth]);

  /** Scroll offset that places chip `index` in the horizontal center of the ribbon. */
  const snapOffsetForIndex = useCallback(
    (index: number) => {
      const raw = index * RIBBON_DAY_STRIDE;
      return Math.max(0, Math.min(raw, maxScrollX()));
    },
    [maxScrollX]
  );

  const indexFromOffset = useCallback(
    (offsetX: number) => {
      const index = Math.round(offsetX / RIBBON_DAY_STRIDE);
      return Math.max(0, Math.min(index, days.length - 1));
    },
    [days.length]
  );

  const cancelReleaseAnim = useCallback(() => {
    if (animFrameRef.current != null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  const scrollToOffsetSafe = useCallback(
    (x: number) => {
      if (!listRef.current || listWidth <= 0) return;
      const clamped = Math.max(0, Math.min(x, maxScrollX()));
      listRef.current.scrollToOffset({ offset: clamped, animated: false });
      scrollXRef.current = clamped;
    },
    [listWidth, maxScrollX]
  );

  const animateToOffset = useCallback(
    (targetX: number, onComplete?: () => void) => {
      cancelReleaseAnim();
      if (!listRef.current || listWidth <= 0) {
        onComplete?.();
        return;
      }
      const end = Math.max(0, Math.min(targetX, maxScrollX()));
      const start = scrollXRef.current;
      if (Math.abs(end - start) < MIN_SNAP_PX) {
        scrollXRef.current = end;
        onComplete?.();
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
          onComplete?.();
        }
      };
      animFrameRef.current = requestAnimationFrame(tick);
    },
    [cancelReleaseAnim, listWidth, maxScrollX]
  );

  const scrollToDate = useCallback(
    (dateKey: string, soft: boolean) => {
      const index = indexForDate(dateKey);
      if (index < 0) return;
      const target = snapOffsetForIndex(index);
      if (soft) animateToOffset(target);
      else scrollToOffsetSafe(target);
    },
    [animateToOffset, indexForDate, scrollToOffsetSafe, snapOffsetForIndex]
  );

  const selectDateKey = useCallback(
    (key: string) => {
      if (key && key !== selectedRef.current) {
        onSelectDate(key);
      }
    },
    [onSelectDate]
  );

  const finishGesture = useCallback(
    (offsetX: number, velocityPxPerMs = 0) => {
      const now = Date.now();
      if (now - endHandledAtRef.current < END_DEBOUNCE_MS) return;
      endHandledAtRef.current = now;

      const projected = offsetX + velocityPxPerMs * 220;
      const index = indexFromOffset(projected);
      const target = snapOffsetForIndex(index);
      const key = days[index]?.key;

      animateToOffset(target, () => {
        if (key) selectDateKey(key);
      });
    },
    [animateToOffset, days, indexFromOffset, selectDateKey, snapOffsetForIndex]
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

  const startPointerDrag = useCallback(
    (pageX: number) => {
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

  const mountedRef = useRef(false);
  const prevLocalTodayRef = useRef(localToday);

  useEffect(() => {
    if (listWidth <= 0) return;
    if (!mountedRef.current) {
      mountedRef.current = true;
      scrollToDate(selectedDate, false);
    }
  }, [listWidth, scrollToDate, selectedDate]);

  useEffect(() => {
    if (listWidth <= 0 || prevLocalTodayRef.current === localToday) return;
    prevLocalTodayRef.current = localToday;
    if (selectedDate === localToday) {
      scrollToDate(localToday, true);
    }
  }, [localToday, listWidth, scrollToDate, selectedDate]);

  useEffect(() => () => cancelReleaseAnim(), [cancelReleaseAnim]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollXRef.current = e.nativeEvent.contentOffset.x;
    contentWidthRef.current = e.nativeEvent.contentSize.width;
  };

  const onSelect = (key: string) => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    selectDateKey(key);
  };

  const getItemLayout = useCallback(
    (_: ArrayLike<DayItem> | null | undefined, index: number) => ({
      length: RIBBON_DAY_STRIDE,
      offset: RIBBON_DAY_STRIDE * index,
      index,
    }),
    []
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > HORIZONTAL_LOCK_PX && Math.abs(g.dx) > Math.abs(g.dy) * 1.15,
        onMoveShouldSetPanResponderCapture: (_, g) =>
          Math.abs(g.dx) > HORIZONTAL_LOCK_PX && Math.abs(g.dx) > Math.abs(g.dy) * 1.15,
        onPanResponderGrant: (evt) => {
          startPointerDrag(evt.nativeEvent.pageX);
        },
        onPanResponderMove: (evt) => {
          movePointer(evt.nativeEvent.pageX);
        },
        onPanResponderRelease: () => endPointerDrag(),
        onPanResponderTerminate: () => endPointerDrag(),
      }),
    [endPointerDrag, movePointer, startPointerDrag]
  );

  const bindWebMouseDrag = useCallback(
    (pageX: number) => {
      if (typeof document === 'undefined') return;
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

  const renderItem = ({ item }: ListRenderItemInfo<DayItem>) => {
    const mark = marks.find((m) => m.date === item.key);
    const selected = item.key === selectedDate;
    const isToday = item.key === todayStr;
    const dotColor =
      mark?.status === 'overdue'
        ? theme.ribbon.overdue
        : mark?.status === 'complete'
          ? theme.ribbon.complete
          : mark?.status === 'upcoming'
            ? theme.orange
            : 'transparent';

    return (
      <SpringPressable
        onPress={() => onSelect(item.key)}
        style={[styles.chip, selected && styles.chipSelected, isToday && !selected && styles.chipToday]}>
        <Text style={[styles.weekday, selected && styles.textSelected]}>{format(item.date, 'EEE')}</Text>
        <Text style={[styles.dayLabel, selected && styles.textSelected]}>{format(item.date, 'M/d')}</Text>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
      </SpringPressable>
    );
  };

  return (
    <View
      style={[styles.wrap, webWrapStyle]}
      onLayout={(e) => {
        const w = Math.round(e.nativeEvent.layout.width);
        if (w > 0 && w !== listWidth) setListWidth(w);
      }}
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
            onTouchEnd: () => endPointerDrag(),
            onTouchCancel: () => endPointerDrag(),
          }
        : {})}>
      {listWidth > 0 && (
        <FlatList
          ref={listRef}
          data={days}
          horizontal
          scrollEnabled={false}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
          scrollEventThrottle={16}
          getItemLayout={getItemLayout}
          contentContainerStyle={[styles.listContent, { paddingHorizontal: sidePad }]}
          onScroll={onScroll}
          onScrollToIndexFailed={(info) => {
            scrollToOffsetSafe(snapOffsetForIndex(info.index));
          }}
          style={webListStyle}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    minHeight: 88,
    marginBottom: 8,
  },
  listContent: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  chip: {
    width: CHIP_WIDTH,
    marginRight: CHIP_GAP,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: theme.radius.md,
    backgroundColor: theme.white,
    borderWidth: 1,
    borderColor: theme.grayLight,
    alignItems: 'center',
  },
  chipSelected: {
    borderColor: theme.orange,
    backgroundColor: theme.orangeSoft,
  },
  chipToday: {
    borderColor: theme.gray,
  },
  weekday: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.grayMuted,
    textTransform: 'uppercase',
  },
  dayLabel: {
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.gray,
    marginTop: 2,
  },
  textSelected: { color: theme.black, fontWeight: '800' },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
});
