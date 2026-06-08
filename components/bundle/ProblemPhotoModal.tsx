import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PhotoInkOverlay } from '@/components/bundle/PhotoInkOverlay';
import { FullscreenInkControls } from '@/components/annotation/FullscreenInkControls';
import { useFullscreenInkFlow } from '@/components/annotation/use-fullscreen-ink-flow';
import { PhotoInkToolbar, type PhotoInkToolKind } from '@/components/bundle/PhotoInkToolbar';
import { ResolvedImage } from '@/components/ui/ResolvedImage';
import { theme } from '@/constants/theme';
import { isHighlighterTool } from '@/lib/domain/ink-sizes';
import { inkToolKind } from '@/lib/domain/ink-tool-labels';
import type { CloudAsset, InkToolId, NoteLayer, PenToolId, PhotoMemo } from '@/lib/domain/types';
import { getFullImageUri, getPreviewImageUri } from '@/lib/files/display-image-uri';
import { useFullscreenViewerLayout } from '@/lib/ui/fullscreen-viewer-layout';

type Side = 'front' | 'back';

type Props = {
  visible: boolean;
  frontAsset: CloudAsset;
  backAsset: CloudAsset | null;
  initialSide?: Side;
  frontMemo: PhotoMemo;
  answerMemo?: PhotoMemo | null;
  legacyLayer?: NoteLayer | null;
  tool: InkToolId;
  penWidth: number;
  highlighterWidth: number;
  eraserWidth: number;
  onToolChange: (tool: InkToolId) => void;
  onPenWidthChange: (w: number) => void;
  onHighlighterWidthChange: (w: number) => void;
  onEraserWidthChange: (w: number) => void;
  onStrokesChange: (side: Side, strokes: NoteLayer['strokes']) => void;
  onClose: () => void;
  onCropRequest: (side: Side) => void;
};

export function ProblemPhotoModal({
  visible,
  frontAsset,
  backAsset,
  initialSide = 'front',
  frontMemo,
  answerMemo,
  legacyLayer,
  tool,
  penWidth,
  highlighterWidth,
  eraserWidth,
  onToolChange,
  onPenWidthChange,
  onHighlighterWidthChange,
  onEraserWidthChange,
  onStrokesChange,
  onClose,
  onCropRequest,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const layout = useFullscreenViewerLayout();
  const [pageIndex, setPageIndex] = useState(0);
  const [viewerSize, setViewerSize] = useState({ w: 0, h: 0 });
  const [inkSurfaceH, setInkSurfaceH] = useState<Record<Side, number>>({ front: 0, back: 0 });
  const [inkKind, setInkKind] = useState<PhotoInkToolKind | null>(null);

  const flowApi = useFullscreenInkFlow({
    visible,
    tool,
    onToolChange,
    onPenWidthChange,
    onHighlighterWidthChange,
    onEraserWidthChange,
  });

  useEffect(() => {
    if (visible) {
      const startOnBack = initialSide === 'back' && Boolean(backAsset);
      setPageIndex(startOnBack ? 1 : 0);
      setInkKind(null);
    }
  }, [backAsset, initialSide, visible]);

  const sides = useMemo(() => {
    const list: { side: Side; asset: CloudAsset; label: string | null }[] = [
      { side: 'front', asset: frontAsset, label: null },
    ];
    if (backAsset) {
      list.push({ side: 'back', asset: backAsset, label: t('item.answerSection') });
    }
    return list;
  }, [frontAsset, backAsset, t]);

  const strokeWidth = useMemo(() => {
    if (tool === 'eraser') return eraserWidth;
    if (isHighlighterTool(tool)) return highlighterWidth;
    return penWidth;
  }, [tool, penWidth, highlighterWidth, eraserWidth]);

  const penTool: PenToolId | null =
    inkToolKind(tool) === 'pen' ? (tool as PenToolId) : null;

  const onSelectKind = (kind: PhotoInkToolKind) => {
    if (kind !== 'crop' && inkKind === kind) {
      setInkKind(null);
      flowApi.clearFlow();
      return;
    }
    setInkKind(kind);
    flowApi.clearFlow();
    if (kind === 'crop') {
      setInkKind(null);
      flowApi.clearFlow();
      onCropRequest(sides[pageIndex]?.side ?? 'front');
      return;
    }
    if (kind === 'eraser') return flowApi.openKind('eraser');
    if (kind === 'highlighter') return flowApi.openKind('highlighter');
    return flowApi.openKind('pen');
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const w = e.nativeEvent.layoutMeasurement.width;
    if (w <= 0) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / w);
    setPageIndex(i);
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setViewerSize({ w: width, h: height });
    }
  };

  const { w: viewerW, h: viewerH } = viewerSize;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>{t('common.close')}</Text>
          </Pressable>
          <Text style={styles.hint}>{t('item.swipeForBack')}</Text>
        </View>

        <PhotoInkToolbar activeKind={inkKind} penTool={penTool} onSelectKind={onSelectKind} />

        {inkKind !== null && flowApi.flow !== null && (
          <FullscreenInkControls
            tool={tool}
            penWidth={penWidth}
            highlighterWidth={highlighterWidth}
            eraserWidth={eraserWidth}
            layout={layout}
            flowApi={flowApi}
            pickerOnly
          />
        )}

        <View style={styles.viewer} onLayout={onLayout}>
          {viewerW > 0 && viewerH > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              scrollEnabled={inkKind === null}
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onScrollEnd}
              scrollEventThrottle={16}
              decelerationRate="fast"
              style={{ width: viewerW, height: viewerH }}
              contentContainerStyle={{ width: viewerW * sides.length, height: viewerH }}>
              {sides.map((item) => {
                const displayUri =
                  getPreviewImageUri(item.asset) ?? getFullImageUri(item.asset);
                return (
                  <View key={item.side} style={[styles.page, { width: viewerW, height: viewerH }]}>
                    {item.label ? <Text style={styles.sideLabel}>{item.label}</Text> : null}
                    <View
                      style={styles.imageBox}
                      onLayout={(e) => {
                        const h = Math.round(e.nativeEvent.layout.height);
                        if (h > 0) {
                          setInkSurfaceH((prev) =>
                            prev[item.side] === h ? prev : { ...prev, [item.side]: h }
                          );
                        }
                      }}>
                      <ResolvedImage
                        uri={displayUri}
                        asset={item.asset}
                        preferPreview={false}
                        style={styles.image}
                        resizeMode="contain"
                      />
                      <PhotoInkOverlay
                        memo={item.side === 'front' ? frontMemo : answerMemo}
                        legacyLayer={item.side === 'front' ? legacyLayer : undefined}
                        surfaceWidth={viewerW}
                        surfaceHeight={inkSurfaceH[item.side] || viewerH}
                        inkInteractive={inkKind !== null}
                        tool={tool}
                        strokeWidth={strokeWidth}
                        onStrokesChange={(strokes) => onStrokesChange(item.side, strokes)}
                        style={inkKind === null ? styles.inkPassthrough : undefined}
                      />
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          ) : null}
          {sides.length > 1 ? (
            <Text style={styles.pager}>
              {pageIndex + 1} / {sides.length}
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.beige, paddingHorizontal: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  close: { color: theme.orange, fontWeight: '800', fontSize: theme.font.body },
  hint: { color: theme.gray, fontSize: theme.font.caption, fontWeight: '600' },
  viewer: { flex: 1, minHeight: 0 },
  page: { flex: 1, minHeight: 0 },
  sideLabel: {
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.gray,
    marginBottom: 4,
    textAlign: 'center',
  },
  imageBox: { flex: 1, minHeight: 0, position: 'relative' },
  image: { width: '100%', height: '100%' },
  inkPassthrough: { pointerEvents: 'none' as const },
  pager: { textAlign: 'center', color: theme.gray, marginTop: 8, fontWeight: '700' },
});
