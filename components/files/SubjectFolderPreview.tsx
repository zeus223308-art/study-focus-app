import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ResolvedImage } from '@/components/ui/ResolvedImage';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';

import { theme } from '@/constants/theme';
import type { SubjectPreviewItem } from '@/lib/files/subject-previews';
import { heightForLandscapeCardWidth } from '@/lib/ui/landscape-card-layout';
import { useViewportLayout } from '@/lib/ui/viewport-layout';

export type PreviewVariant = 'vault' | 'dashboard';

type Props = {
  items: SubjectPreviewItem[];
  totalLabel: string;
  emptyHint: string;
  onOpen: () => void;
  onGestureLock: (locked: boolean) => void;
  onLongPress?: () => void;
  /** Parent handles long-press drag; avoid stealing touches. */
  passthroughGestures?: boolean;
  variant?: PreviewVariant;
  /** Shown as small tag on top-left inside the card (dashboard). */
  subjectTag?: string;
  onInteraction?: () => void;
};

const VAULT_HEIGHT = 112;
const DASHBOARD_HEIGHT = 120;

export function SubjectFolderPreview({
  items,
  totalLabel,
  emptyHint,
  onOpen,
  onGestureLock,
  onLongPress,
  passthroughGestures = false,
  variant = 'vault',
  subjectTag,
  onInteraction,
}: Props) {
  const { t } = useTranslation();
  const viewport = useViewportLayout();
  const portraitHeight = variant === 'dashboard' ? DASHBOARD_HEIGHT : VAULT_HEIGHT;
  const [cardWidth, setCardWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const didSwipeRef = useRef(false);

  const lock = useCallback(() => onGestureLock(true), [onGestureLock]);
  const unlock = useCallback(() => onGestureLock(false), [onGestureLock]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onUp = () => unlock();
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, [unlock]);

  const setIndexAndNotify = (i: number) => {
    setIndex(i);
    onInteraction?.();
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (cardWidth <= 0) return;
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / cardWidth);
    setIndexAndNotify(Math.max(0, Math.min(i, items.length - 1)));
    didSwipeRef.current = true;
    setTimeout(() => {
      didSwipeRef.current = false;
    }, 120);
  };

  const cardHeight =
    cardWidth > 0 && viewport.isLandscape
      ? heightForLandscapeCardWidth(cardWidth, true)
      : portraitHeight;

  const cardStyle = [
    styles.cardBase,
    variant === 'vault' ? styles.cardVault : styles.cardDashboard,
    viewport.isLandscape && cardWidth > 0
      ? { height: cardHeight }
      : { minHeight: portraitHeight, height: portraitHeight },
  ];
  const emptyStyle = [
    styles.emptyCardBase,
    variant === 'vault' ? styles.cardVault : styles.cardDashboard,
    viewport.isLandscape && cardWidth > 0
      ? { height: cardHeight }
      : { minHeight: portraitHeight },
  ];

  const renderItem = ({ item }: ListRenderItemInfo<SubjectPreviewItem>) => {
    const slide = (
      <View style={[styles.slide, { width: cardWidth, height: cardHeight }]}>
        <ResolvedImage uri={item.thumbnailUri} style={styles.image} resizeMode="cover" />
      </View>
    );
    if (passthroughGestures) return slide;
    return (
      <Pressable
        style={[styles.slide, { width: cardWidth, height: cardHeight }]}
        onPress={() => {
          if (!didSwipeRef.current) {
            onInteraction?.();
            onOpen();
          }
        }}>
        <ResolvedImage uri={item.thumbnailUri} style={styles.image} resizeMode="cover" />
      </Pressable>
    );
  };

  if (items.length === 0) {
    if (passthroughGestures) {
      return (
        <Pressable
          style={emptyStyle}
          onPress={onOpen}
          onLongPress={onLongPress}
          delayLongPress={500}>
          {subjectTag ? (
            <View style={styles.subjectTag}>
              <Text style={styles.subjectTagText}>{subjectTag}</Text>
            </View>
          ) : null}
          <Text style={styles.emptyHint}>{emptyHint}</Text>
          <Text style={styles.total}>{totalLabel}</Text>
        </Pressable>
      );
    }
    return (
      <Pressable
        style={emptyStyle}
        onPress={onOpen}
        onLongPress={onLongPress}
        delayLongPress={450}>
        {subjectTag ? (
          <View style={styles.subjectTag}>
            <Text style={styles.subjectTagText}>{subjectTag}</Text>
          </View>
        ) : null}
        <Text style={styles.emptyHint}>{emptyHint}</Text>
        <Text style={styles.total}>{totalLabel}</Text>
      </Pressable>
    );
  }

  if (passthroughGestures) {
    const first = items[0];
    return (
      <View
        style={cardStyle}
        pointerEvents="none"
        onLayout={(e) => {
          const w = Math.round(e.nativeEvent.layout.width);
          if (w > 0 && w !== cardWidth) setCardWidth(w);
        }}>
        {subjectTag ? (
          <View style={styles.subjectTag}>
            <Text style={styles.subjectTagText} numberOfLines={1}>
              {subjectTag}
            </Text>
          </View>
        ) : null}
        <View style={[styles.slide, { height: cardHeight }]}>
          <ResolvedImage uri={first.thumbnailUri} style={styles.image} resizeMode="cover" />
        </View>
        <View style={styles.overlay}>
          <Text style={styles.badge}>{totalLabel}</Text>
          {items.length > 1 ? (
            <Text style={styles.counter}>
              1 / {items.length}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  const CardWrap = Pressable;

  return (
    <CardWrap
      onLongPress={onLongPress}
      delayLongPress={450}
      style={cardStyle}
      onLayout={(e) => {
        const w = Math.round(e.nativeEvent.layout.width);
        if (w > 0 && w !== cardWidth) setCardWidth(w);
      }}
      onTouchStart={() => {
        lock();
        onInteraction?.();
      }}
      onTouchEnd={unlock}
      onTouchCancel={unlock}
      {...(Platform.OS === 'web'
        ? {
            onMouseDown: () => {
              lock();
              onInteraction?.();
            },
          }
        : {})}>
      {subjectTag ? (
        <View style={styles.subjectTag} pointerEvents="none">
          <Text style={styles.subjectTagText} numberOfLines={1}>
            {subjectTag}
          </Text>
        </View>
      ) : null}
      {cardWidth > 0 && (
        <FlatList
          data={items}
          horizontal
          pagingEnabled
          scrollEnabled={!passthroughGestures}
          nestedScrollEnabled={!passthroughGestures}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(it) => `${it.bundleId}-${it.pageId}`}
          renderItem={renderItem}
          onMomentumScrollEnd={onScrollEnd}
          style={styles.list}
          getItemLayout={(_, i) => ({
            length: cardWidth,
            offset: cardWidth * i,
            index: i,
          })}
        />
      )}
      <View style={styles.overlay} pointerEvents="none">
        <Text style={styles.badge}>{totalLabel}</Text>
        {items.length > 1 ? (
          <Text style={styles.counter}>
            {index + 1} / {items.length}
          </Text>
        ) : null}
      </View>
      <Pressable
        style={styles.openFab}
        onPress={() => {
          onInteraction?.();
          onOpen();
        }}
        hitSlop={8}>
        <Text style={styles.openFabText}>{t('common.arrowRight')}</Text>
      </Pressable>
    </CardWrap>
  );
}

const styles = StyleSheet.create({
  cardBase: {
    backgroundColor: theme.surface,
    overflow: 'hidden',
    ...Platform.select({
      web: { touchAction: 'pan-x', cursor: 'grab' } as object,
      default: {},
    }),
  },
  cardVault: {
    borderRadius: theme.radius.sm,
    borderWidth: 1.5,
    borderColor: theme.black,
  },
  cardDashboard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.grayLight,
    ...theme.cardShadow,
  },
  list: { flex: 1 },
  slide: {
    backgroundColor: theme.grayLight,
  },
  image: { width: '100%', height: '100%' },
  subjectTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 2,
    backgroundColor: theme.orange,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    maxWidth: '72%',
  },
  subjectTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.white,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.white,
  },
  counter: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.orangeSoft,
  },
  openFab: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.grayLight,
    zIndex: 2,
  },
  openFabText: { fontSize: 14, fontWeight: '800', color: theme.orange },
  emptyCardBase: {
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 6,
    position: 'relative',
  },
  emptyHint: {
    fontSize: theme.font.caption,
    fontWeight: '600',
    color: theme.grayMuted,
    textAlign: 'center',
  },
  total: {
    fontSize: theme.font.bodySmall,
    fontWeight: '700',
    color: theme.gray,
    textAlign: 'center',
  },
});
