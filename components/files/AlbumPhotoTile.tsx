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
const DOUBLE_TAP_MS = 320;

type Props = {
  bundleId: string;
  sourceSubjectId: string;
  thumbnailUri: string;
  countLabel?: string;
  cellWidth: number;
  onOpen: () => void;
  onDragMove?: (pageX: number, pageY: number) => void;
  onDragEnd?: (pageX: number, pageY: number) => void;
  /** Long-press → yes/no delete confirm. */
  onDeleteRequest?: () => void;
  /** Double-tap menu (archive, restore). */
  onPhotoAction?: () => void;
  pickMode?: boolean;
  pickSelected?: boolean;
  onTogglePick?: () => void;
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
  onDeleteRequest,
  onPhotoAction,
  pickMode,
  pickSelected,
  onTogglePick,
  style,
}: Props) {
  const { movingBundleId, startMovingBundle, cancelMovingBundle } = useApp();
  const dragSelected = movingBundleId === bundleId;
  const didDragRef = useRef(false);
  const pointerDragRef = useRef({ active: false, startX: 0, startY: 0 });
  const lastTapRef = useRef(0);

  const onLongPress = useCallback(() => {
    if (pickMode) return;
    if (onDeleteRequest) {
      onDeleteRequest();
      return;
    }
    if (onPhotoAction) {
      onPhotoAction();
      return;
    }
    startMovingBundle(bundleId, sourceSubjectId);
  }, [pickMode, onDeleteRequest, onPhotoAction, bundleId, sourceSubjectId, startMovingBundle]);

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
      if (!pointerDragRef.current.active || !dragSelected) return;
      const dx = pageX - pointerDragRef.current.startX;
      const dy = pageY - pointerDragRef.current.startY;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        didDragRef.current = true;
      }
      onDragMove?.(pageX, pageY);
    },
    [onDragMove, dragSelected]
  );

  const startDrag = useCallback(
    (pageX: number, pageY: number) => {
      if (!dragSelected) return;
      didDragRef.current = false;
      pointerDragRef.current = { active: true, startX: pageX, startY: pageY };
    },
    [dragSelected]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => dragSelected && !pickMode,
        onMoveShouldSetPanResponder: () => dragSelected && !pickMode,
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
    [dragSelected, pickMode, endDrag, moveDrag, startDrag]
  );

  const bindWebMouse = useCallback(
    (pageX: number, pageY: number) => {
      if (!dragSelected || typeof document === 'undefined' || pickMode) return;
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
    [dragSelected, pickMode, endDrag, moveDrag, startDrag]
  );

  const handlePress = useCallback(() => {
    if (pickMode) {
      onTogglePick?.();
      return;
    }
    if (movingBundleId && movingBundleId !== bundleId) {
      startMovingBundle(bundleId, sourceSubjectId);
      return;
    }
    if (movingBundleId) {
      cancelMovingBundle();
      return;
    }

    const now = Date.now();
    if (onPhotoAction && now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      onPhotoAction();
      return;
    }
    lastTapRef.current = now;

    if (!didDragRef.current) onOpen();
  }, [
    pickMode,
    onTogglePick,
    movingBundleId,
    bundleId,
    sourceSubjectId,
    startMovingBundle,
    cancelMovingBundle,
    onPhotoAction,
    onOpen,
  ]);

  const showPickCheck = pickMode;
  const tileHighlighted = pickMode ? pickSelected : dragSelected;

  return (
    <View style={[styles.cell, { width: cellWidth }, style]}>
      <Pressable
        onPress={handlePress}
        onLongPress={onLongPress}
        delayLongPress={380}
        style={[styles.tile, tileHighlighted && styles.tileSelected]}
        {...(!IS_WEB && !pickMode ? panResponder.panHandlers : {})}
        {...(IS_WEB && dragSelected && !pickMode
          ? {
              onMouseDown: (e: { button?: number; nativeEvent: { pageX: number; pageY: number } }) => {
                if (e.button !== undefined && e.button !== 0) return;
                bindWebMouse(e.nativeEvent.pageX, e.nativeEvent.pageY);
              },
            }
          : {})}>
        <ResolvedImage uri={thumbnailUri} style={styles.image} resizeMode="cover" />
        {showPickCheck ? (
          <View style={[styles.pickBadge, pickSelected && styles.pickBadgeOn]}>
            {pickSelected ? (
              <SymbolView
                name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                size={11}
                tintColor={theme.white}
              />
            ) : null}
          </View>
        ) : null}
        {dragSelected && !pickMode ? (
          <View style={styles.dragBadge}>
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
  pickBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.white,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickBadgeOn: {
    backgroundColor: theme.orange,
    borderColor: theme.orange,
  },
  dragBadge: {
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
});
