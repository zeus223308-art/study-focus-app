import { useCallback, useMemo, useRef } from 'react';
import {
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ResolvedImage } from '@/components/ui/ResolvedImage';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

const IS_WEB = Platform.OS === 'web';
const DRAG_THRESHOLD = 8;

type Props = {
  bundleId: string;
  sourceSubjectId: string;
  thumbnailUri: string;
  countLabel?: string;
  cellWidth: number;
  onOpen: () => void;
  onDragMove?: (pageX: number, pageY: number) => void;
  onDragEnd?: (pageX: number, pageY: number) => void;
  onDelete?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function AlbumPhotoTile({
  bundleId,
  sourceSubjectId,
  thumbnailUri,
  countLabel,
  cellWidth,
  onOpen,
  onDragMove,
  onDragEnd,
  onDelete,
  style,
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
      if (didDragRef.current) onDragEnd?.(pageX, pageY);
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
    <View style={[styles.cell, { width: cellWidth }, style]}>
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
        style={[styles.tile, selected && styles.tileSelected]}
        {...(!IS_WEB ? panResponder.panHandlers : {})}
        {...(IS_WEB && selected
          ? {
              onMouseDown: (e: { button?: number; nativeEvent: { pageX: number; pageY: number } }) => {
                if (e.button !== undefined && e.button !== 0) return;
                bindWebMouse(e.nativeEvent.pageX, e.nativeEvent.pageY);
              },
            }
          : {})}>
        <ResolvedImage uri={thumbnailUri} style={styles.image} resizeMode="cover" />
        {selected ? (
          <View style={styles.checkBadge}>
            <SymbolView
              name={{ ios: 'checkmark', android: 'check', web: 'check' }}
              size={12}
              tintColor={theme.white}
            />
          </View>
        ) : null}
        {countLabel ? (
          <View style={styles.countBadge}>
            <Text style={styles.countText} numberOfLines={1}>
              {countLabel}
            </Text>
          </View>
        ) : null}
      </Pressable>
      {!movingBundleId && onDelete ? (
        <Pressable style={styles.deleteBtn} onPress={onDelete} hitSlop={6}>
          <SymbolView
            name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }}
            size={22}
            tintColor={theme.white}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    marginBottom: 8,
  },
  tile: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    backgroundColor: theme.grayLight,
    borderWidth: 1,
    borderColor: theme.grayLight,
  },
  tileSelected: {
    borderColor: theme.orange,
    borderWidth: 2,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    maxWidth: '80%',
  },
  countText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.white,
  },
  deleteBtn: {
    position: 'absolute',
    top: 4,
    left: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    ...(IS_WEB ? ({ cursor: 'pointer' } as const) : null),
  },
});
