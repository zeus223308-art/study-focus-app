import { useCallback, useMemo, useRef } from 'react';
import {
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ResolvedImage } from '@/components/ui/ResolvedImage';
import { useApp } from '@/context/AppContext';
import { theme } from '@/constants/theme';

const IS_WEB = Platform.OS === 'web';
const DRAG_THRESHOLD = 8;

type Props = {
  bundleId: string;
  sourceSubjectId: string;
  thumbnailUri: string;
  titleLabel?: string | null;
  dateLabel: string;
  countLabel?: string;
  onOpen: () => void;
  onDragMove?: (pageX: number, pageY: number) => void;
  onDragEnd?: (pageX: number, pageY: number) => void;
  onDelete?: () => void;
};

export function BundleGalleryCard({
  bundleId,
  sourceSubjectId,
  thumbnailUri,
  titleLabel,
  dateLabel,
  countLabel,
  onOpen,
  onDragMove,
  onDragEnd,
  onDelete,
}: Props) {
  const { movingBundleId, startMovingBundle, cancelMovingBundle } = useApp();
  const selected = movingBundleId === bundleId;
  const didDragRef = useRef(false);
  const pointerDragRef = useRef({ active: false, startX: 0, startY: 0 });

  const onLongPress = useCallback(() => {
    startMovingBundle(bundleId, sourceSubjectId);
  }, [bundleId, sourceSubjectId, startMovingBundle]);

  const endDrag = useCallback(
    (pageX: number, pageY: number) => {
      if (!pointerDragRef.current.active) return;
      pointerDragRef.current.active = false;
      if (didDragRef.current) {
        onDragEnd?.(pageX, pageY);
      }
      didDragRef.current = false;
    },
    [onDragEnd]
  );

  const moveDrag = useCallback(
    (pageX: number, pageY: number) => {
      if (!pointerDragRef.current.active || !selected) return;
      const dx = pageX - pointerDragRef.current.startX;
      const dy = pageY - pointerDragRef.current.startY;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        didDragRef.current = true;
      }
      onDragMove?.(pageX, pageY);
    },
    [onDragMove, selected]
  );

  const startDrag = useCallback(
    (pageX: number, pageY: number) => {
      if (!selected) return;
      didDragRef.current = false;
      pointerDragRef.current = { active: true, startX: pageX, startY: pageY };
    },
    [selected]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => selected,
        onMoveShouldSetPanResponder: () => selected,
        onPanResponderGrant: (evt) => {
          const { pageX, pageY } = evt.nativeEvent;
          startDrag(pageX, pageY);
        },
        onPanResponderMove: (evt) => {
          const { pageX, pageY } = evt.nativeEvent;
          moveDrag(pageX, pageY);
        },
        onPanResponderRelease: (evt) => {
          const { pageX, pageY } = evt.nativeEvent;
          endDrag(pageX, pageY);
        },
        onPanResponderTerminate: (evt) => {
          const { pageX, pageY } = evt.nativeEvent;
          endDrag(pageX, pageY);
        },
      }),
    [endDrag, moveDrag, selected, startDrag]
  );

  const bindWebMouse = useCallback(
    (pageX: number, pageY: number) => {
      if (!selected || typeof document === 'undefined') return;
      startDrag(pageX, pageY);
      const onMove = (ev: MouseEvent) => moveDrag(ev.pageX, ev.pageY);
      const onUp = (ev: MouseEvent) => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        endDrag(ev.pageX, ev.pageY);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [endDrag, moveDrag, selected, startDrag]
  );

  return (
    <View style={[styles.card, selected && styles.cardSelected]}>
      <Pressable
        onPress={() => {
          if (movingBundleId && movingBundleId !== bundleId) {
            startMovingBundle(bundleId, sourceSubjectId);
            return;
          }
          if (movingBundleId) {
            cancelMovingBundle();
            return;
          }
          if (!didDragRef.current) onOpen();
        }}
        onLongPress={onLongPress}
        delayLongPress={380}
        style={styles.cardBody}
        {...(!IS_WEB ? panResponder.panHandlers : {})}
        {...(IS_WEB && selected
          ? {
              onMouseDown: (e: { button?: number; nativeEvent: { pageX: number; pageY: number } }) => {
                if (e.button !== undefined && e.button !== 0) return;
                bindWebMouse(e.nativeEvent.pageX, e.nativeEvent.pageY);
              },
            }
          : {})}>
        <View style={styles.thumbWrap}>
          <ResolvedImage uri={thumbnailUri} style={styles.thumb} />
          {selected && (
            <View style={styles.checkBadge}>
              <SymbolView
                name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                size={14}
                tintColor={theme.white}
              />
            </View>
          )}
        </View>
        <View style={styles.meta}>
          {titleLabel ? (
            <Text style={styles.cardTitle} numberOfLines={2}>
              {titleLabel}
            </Text>
          ) : null}
          <Text style={[styles.date, !titleLabel && styles.dateOnly]}>{dateLabel}</Text>
          {countLabel ? <Text style={styles.count}>{countLabel}</Text> : null}
        </View>
      </Pressable>
      {!movingBundleId && onDelete ? (
        <Pressable
          style={styles.deleteBtn}
          onPress={(e) => {
            e?.stopPropagation?.();
            onDelete();
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Delete">
          <SymbolView
            name={{ ios: 'trash', android: 'delete', web: 'delete' }}
            size={18}
            tintColor={theme.gray}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.grayLight,
  },
  cardSelected: {
    borderColor: theme.orange,
    borderWidth: 2,
  },
  cardBody: {
    flex: 1,
    flexDirection: 'row',
    minWidth: 0,
  },
  deleteBtn: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: theme.grayLight,
    backgroundColor: theme.beige,
    zIndex: 2,
    ...(IS_WEB ? ({ cursor: 'pointer' } as const) : null),
  },
  thumbWrap: {
    position: 'relative',
  },
  thumb: { width: 88, height: 110 },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { flex: 1, justifyContent: 'center', paddingHorizontal: 16 },
  cardTitle: {
    fontSize: theme.font.body,
    fontWeight: '800',
    color: theme.black,
    lineHeight: 22,
    marginBottom: 6,
  },
  date: { fontSize: theme.font.caption, fontWeight: '700', color: theme.gray },
  dateOnly: { fontSize: theme.font.heading, fontWeight: '800', color: theme.black },
  count: { fontSize: theme.font.caption, color: theme.gray, marginTop: 6 },
});
