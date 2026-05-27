import { useCallback } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ResolvedImage } from '@/components/ui/ResolvedImage';
import { HoldDragSurface } from '@/components/ui/HoldDragSurface';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

const IS_WEB = Platform.OS === 'web';

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
  /** Long-press opens action menu (send to new folder, etc.). */
  onHoldMenu?: () => void;
  /** First tap arms; second touch + hold opens delete confirm. */
  onDeleteHold?: () => void;
  pickMode?: boolean;
  pickSelected?: boolean;
  onTogglePick?: () => void;
  onGestureActiveChange?: (active: boolean) => void;
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
  onHoldMenu,
  onDeleteHold,
  pickMode,
  pickSelected,
  onTogglePick,
  onGestureActiveChange,
  style,
}: Props) {
  const { movingBundleId, draggingItemKey, dragHoverItemKey } = useApp();
  const contextLifted = movingBundleId === bundleId && draggingItemKey === itemDragKey;
  const itemHover = dragHoverItemKey === itemDragKey && !contextLifted;
  const dragEnabled = !pickMode && Boolean(onDragMove);

  const handlePress = useCallback(() => {
    if (pickMode) {
      onTogglePick?.();
      return;
    }
    if (movingBundleId) return;
    onOpen();
  }, [pickMode, onTogglePick, movingBundleId, onOpen]);

  const handleLift = useCallback(() => {
    onLiftForDrag();
  }, [onLiftForDrag]);

  const handleDragEnd = useCallback(
    (moved: boolean, pageX: number, pageY: number) => {
      onDragEnd?.(moved, pageX, pageY);
    },
    [onDragEnd]
  );

  const tileHighlighted = pickMode ? pickSelected : contextLifted || itemHover;
  const showLifted = contextLifted;

  if (pickMode) {
    return (
      <View style={[styles.cell, { width: cellWidth }, style]}>
        <Pressable
          onPress={handlePress}
          style={[styles.tile, tileHighlighted && styles.tileSelected]}>
          <ResolvedImage uri={thumbnailUri} style={styles.image} resizeMode="cover" />
          <View style={[styles.pickBadge, pickSelected && styles.pickBadgeOn]}>
            {pickSelected ? (
              <SymbolView
                name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                size={11}
                tintColor={theme.white}
              />
            ) : null}
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.cell, { width: cellWidth }, style]}>
      <HoldDragSurface
        enabled={dragEnabled}
        onLift={handleLift}
        onHoldMenu={onHoldMenu}
        onDragMove={onDragMove}
        onDragEnd={handleDragEnd}
        onPress={handlePress}
        onDeleteHold={onDeleteHold}
        onGestureActiveChange={onGestureActiveChange}
        style={[
          styles.tile,
          tileHighlighted && styles.tileSelected,
          showLifted && styles.tileLifted,
          showLifted && styles.tileLiftedShadow,
          itemHover && styles.tileHover,
        ]}>
        <View pointerEvents="none" style={styles.tileContent}>
          <ResolvedImage uri={thumbnailUri} style={styles.image} resizeMode="cover" />
          {showLifted ? (
            <View style={styles.dragBadge}>
              <SymbolView
                name={{ ios: 'line.3.horizontal', android: 'menu', web: 'menu' }}
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
        </View>
      </HoldDragSurface>
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
    ...(IS_WEB ? ({ cursor: 'grab', touchAction: 'manipulation', userSelect: 'none' } as object) : null),
  },
  tileContent: {
    width: '100%',
    height: '100%',
  },
  tileSelected: {
    borderColor: theme.orange,
    borderWidth: 2,
  },
  tileHover: {
    borderColor: theme.orange,
    borderWidth: 2,
    backgroundColor: theme.orangeMuted,
  },
  tileLifted: {
    opacity: 0.88,
    transform: [{ scale: 1.04 }],
    borderColor: theme.orange,
    borderWidth: 2,
    zIndex: 20,
  },
  tileLiftedShadow: {
    ...theme.cardShadow,
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
