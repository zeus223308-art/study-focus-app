import { useCallback } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SymbolView } from 'expo-symbols';
import Svg, { Path } from 'react-native-svg';

import { ResolvedImage } from '@/components/ui/ResolvedImage';
import { HoldDragSurface } from '@/components/ui/HoldDragSurface';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { albumMemoBadgeMetrics } from '@/lib/domain/photo-memo';
import type { CloudAsset } from '@/lib/domain/types';
import { heightForLandscapeCardWidth } from '@/lib/ui/landscape-card-layout';
import { resolveTagColor } from '@/lib/ui/tag-colors';
import { useViewportLayout } from '@/lib/ui/viewport-layout';

const IS_WEB = Platform.OS === 'web';

/** Horizontal ribbon banner: body height + left fishtail notch width. */
const RIBBON_H = 12;
const RIBBON_NOTCH_W = 4;
/** Left fishtail: two outward points with a center notch, one filled shape. */
const RIBBON_TAIL_PATH = `M0 0 L${RIBBON_NOTCH_W} 0 L${RIBBON_NOTCH_W} ${RIBBON_H} L0 ${RIBBON_H} L${RIBBON_NOTCH_W} ${RIBBON_H / 2} Z`;

type Props = {
  bundleId: string;
  pageId: string;
  itemDragKey: string;
  sourceSubjectId: string;
  thumbnailUri: string;
  asset: CloudAsset;
  /** Color-coded tag chips shown on the photo (replaces problem number). */
  tags?: string[];
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
  /** Small memo pad icon when this problem has front/back memo content. */
  showMemoBadge?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AlbumPhotoTile({
  bundleId,
  itemDragKey,
  thumbnailUri,
  asset,
  tags,
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
  showMemoBadge = false,
  style,
}: Props) {
  const { data, movingBundleId, draggingItemKey, dragHoverItemKey } = useApp();
  const ribbonColor = resolveTagColor(data.settings.tagColor);
  const viewport = useViewportLayout();
  const landscapeTileH = viewport.isLandscape
    ? heightForLandscapeCardWidth(cellWidth, true)
    : undefined;
  const memoBadge = albumMemoBadgeMetrics(cellWidth);
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

  const visibleTags = (tags ?? []).filter((t) => t.trim().length > 0).slice(0, 3);
  const tagChipsEl =
    visibleTags.length > 0 && !showLifted ? (
      <View style={styles.tagRow} pointerEvents="none">
        {visibleTags.map((tag, i) => (
          <View key={`${tag}-${i}`} style={styles.ribbon}>
            <Svg width={RIBBON_NOTCH_W} height={RIBBON_H}>
              <Path d={RIBBON_TAIL_PATH} fill={ribbonColor} />
            </Svg>
            <View style={[styles.ribbonBody, { backgroundColor: ribbonColor }]}>
              <Text style={styles.tagText} numberOfLines={1}>
                {tag}
              </Text>
            </View>
          </View>
        ))}
      </View>
    ) : null;

  const memoBadgeEl =
    showMemoBadge && !showLifted ? (
      <View
        style={[
          styles.memoBadge,
          {
            top: memoBadge.inset,
            right: memoBadge.inset,
            width: memoBadge.size,
            height: memoBadge.size,
            borderRadius: memoBadge.size / 2,
          },
        ]}
        pointerEvents="none">
        <SymbolView
          name={{ ios: 'note.text', android: 'description', web: 'description' }}
          size={memoBadge.icon}
          tintColor={theme.orange}
        />
      </View>
    ) : null;

  if (pickMode) {
    return (
      <View style={[styles.cell, { width: cellWidth }, style]}>
        <Pressable
          onPress={handlePress}
          style={[
            styles.tile,
            landscapeTileH ? { height: landscapeTileH } : styles.tilePortrait,
            tileHighlighted && styles.tileSelected,
          ]}>
          <ResolvedImage uri={thumbnailUri} asset={asset} style={styles.image} resizeMode="cover" />
          {memoBadgeEl}
          {tagChipsEl}
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
          landscapeTileH ? { height: landscapeTileH } : styles.tilePortrait,
          tileHighlighted && styles.tileSelected,
          showLifted && styles.tileLifted,
          showLifted && styles.tileLiftedShadow,
          itemHover && styles.tileHover,
        ]}>
        <View pointerEvents="none" style={styles.tileContent}>
          <ResolvedImage uri={thumbnailUri} asset={asset} style={styles.image} resizeMode="cover" />
          {showLifted ? (
            <View style={styles.dragBadge}>
              <SymbolView
                name={{ ios: 'line.3.horizontal', android: 'menu', web: 'menu' }}
                size={12}
                tintColor={theme.white}
              />
            </View>
          ) : null}
          {memoBadgeEl}
          {tagChipsEl}
        </View>
      </HoldDragSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {},
  tilePortrait: {
    width: '100%',
    aspectRatio: 1,
  },
  tile: {
    width: '100%',
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: theme.grayLight,
    borderWidth: StyleSheet.hairlineWidth,
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
  tagRow: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 6,
    columnGap: 7,
  },
  ribbon: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
  },
  ribbonBody: {
    height: RIBBON_H,
    justifyContent: 'center',
    paddingLeft: 4,
    paddingRight: 6,
    flexShrink: 1,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  tagText: {
    fontSize: 8,
    lineHeight: 9,
    fontWeight: '800',
    color: theme.white,
  },
  memoBadge: {
    position: 'absolute',
    zIndex: 5,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
