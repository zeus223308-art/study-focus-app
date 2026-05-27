import { useCallback, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ResolvedImage } from '@/components/ui/ResolvedImage';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useLongPressDragGesture } from '@/lib/ui/long-press-drag';

const IS_WEB = Platform.OS === 'web';
const DOUBLE_TAP_MS = 320;

type Props = {
  bundleId: string;
  pageId: string;
  itemDragKey: string;
  sourceSubjectId: string;
  thumbnailUri: string;
  countLabel?: string;
  cellWidth: number;
  onOpen: () => void;
  onDragMove?: (pageX: number, pageY: number) => void;
  onDragEnd?: (moved: boolean, pageX: number, pageY: number) => void;
  onLiftForDrag: () => void;
  /** Double-tap menu (archive, delete). */
  onPhotoAction?: () => void;
  pickMode?: boolean;
  pickSelected?: boolean;
  onTogglePick?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function AlbumPhotoTile({
  bundleId,
  itemDragKey,
  thumbnailUri,
  countLabel,
  cellWidth,
  onOpen,
  onDragMove,
  onDragEnd,
  onLiftForDrag,
  onPhotoAction,
  pickMode,
  pickSelected,
  onTogglePick,
  style,
}: Props) {
  const { movingBundleId, draggingItemKey, dragHoverItemKey, cancelMovingBundle } = useApp();
  const dragLifted = movingBundleId === bundleId && draggingItemKey === itemDragKey;
  const itemHover = dragHoverItemKey === itemDragKey && !dragLifted;
  const lastTapRef = useRef(0);

  const onShortPress = useCallback(() => {
    if (pickMode) {
      onTogglePick?.();
      return;
    }
    if (dragLifted) {
      cancelMovingBundle();
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
    onOpen();
  }, [
    pickMode,
    onTogglePick,
    dragLifted,
    movingBundleId,
    cancelMovingBundle,
    onPhotoAction,
    onOpen,
  ]);

  const { panHandlers, bindWebMouse } = useLongPressDragGesture({
    enabled: !pickMode && Boolean(onDragMove),
    instantDrag: dragLifted,
    onLift: onLiftForDrag,
    onDragMove,
    onDragEnd,
    onShortPress,
  });

  const tileHighlighted = pickMode ? pickSelected : dragLifted || itemHover;

  return (
    <View style={[styles.cell, { width: cellWidth }, style]}>
      <View
        style={[styles.tile, tileHighlighted && styles.tileSelected, dragLifted && styles.tileLifted]}
        {...(!IS_WEB && !pickMode ? panHandlers : {})}
        {...(IS_WEB && !pickMode
          ? {
              onMouseDown: (e: { button?: number; nativeEvent: { pageX: number; pageY: number } }) => {
                if (e.button !== undefined && e.button !== 0) return;
                bindWebMouse(e.nativeEvent.pageX, e.nativeEvent.pageY);
              },
            }
          : pickMode
            ? {}
            : {})}>
        <Pressable style={styles.fill} onPress={pickMode ? onShortPress : undefined}>
          <ResolvedImage uri={thumbnailUri} style={styles.image} resizeMode="cover" />
        </Pressable>
        {pickMode ? (
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
        {dragLifted && !pickMode ? (
          <View style={styles.dragBadge}>
            <SymbolView
              name={{ ios: 'line.3.horizontal', android: 'menu', web: 'menu' }}
              size={12}
              tintColor={theme.white}
            />
          </View>
        ) : null}
        {countLabel ? (
          <View style={styles.countBadge} pointerEvents="none">
            <Text style={styles.countText} numberOfLines={1}>
              {countLabel}
            </Text>
          </View>
        ) : null}
      </View>
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
  fill: {
    width: '100%',
    height: '100%',
  },
  tileSelected: {
    borderColor: theme.orange,
    borderWidth: 2,
  },
  tileLifted: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
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
