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

import { AnnotationCanvas } from '@/components/annotation/AnnotationCanvas';
import { FullscreenInkControls } from '@/components/annotation/FullscreenInkControls';
import { useFullscreenInkFlow } from '@/components/annotation/use-fullscreen-ink-flow';
import { PhotoInkToolbar, type PhotoInkToolKind } from '@/components/bundle/PhotoInkToolbar';
import { ResolvedImage } from '@/components/ui/ResolvedImage';
import { theme } from '@/constants/theme';
import { isHighlighterTool } from '@/lib/domain/ink-sizes';
import { inkToolKind } from '@/lib/domain/ink-tool-labels';
import type { CloudAsset, InkToolId, NoteLayer, PenToolId } from '@/lib/domain/types';
import { getFullImageUri, getPreviewImageUri } from '@/lib/files/display-image-uri';
import { useFullscreenViewerLayout } from '@/lib/ui/fullscreen-viewer-layout';

type Side = 'front' | 'back';

type Props = {
  visible: boolean;
  frontAsset: CloudAsset;
  backAsset: CloudAsset | null;
  initialSide?: Side;
  layer: NoteLayer | null;
  tool: InkToolId;
  penWidth: number;
  highlighterWidth: number;
  eraserWidth: number;
  onToolChange: (tool: InkToolId) => void;
  onPenWidthChange: (w: number) => void;
  onHighlighterWidthChange: (w: number) => void;
  onEraserWidthChange: (w: number) => void;
  onStrokesChange: (strokes: NoteLayer['strokes']) => void;
  onBeforeInkUse?: () => void;
  onClose: () => void;
  onCropRequest: (side: Side) => void;
};

export function ProblemPhotoModal({
  visible,
  frontAsset,
  backAsset,
  initialSide = 'front',
  layer,
  tool,
  penWidth,
  highlighterWidth,
  eraserWidth,
  onToolChange,
  onPenWidthChange,
  onHighlighterWidthChange,
  onEraserWidthChange,
  onStrokesChange,
  onBeforeInkUse,
  onClose,
  onCropRequest,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const layout = useFullscreenViewerLayout();
  const { isLandscape } = layout;
  const [pageIndex, setPageIndex] = useState(0);
  const [viewerW, setViewerW] = useState(0);
  const [inkKind, setInkKind] = useState<PhotoInkToolKind | null>(null);

  const flowApi = useFullscreenInkFlow({
    visible,
    tool,
    onToolChange,
    onPenWidthChange,
    onHighlighterWidthChange,
    onEraserWidthChange,
    onBeforeInkUse,
  });

  useEffect(() => {
    if (visible) {
      const startOnBack = initialSide === 'back' && Boolean(backAsset);
      setPageIndex(startOnBack ? 1 : 0);
      setInkKind(null);
    }
  }, [backAsset, initialSide, visible]);

  const sides = useMemo(() => {
    const list: { side: Side; asset: CloudAsset; label: string }[] = [
      { side: 'front', asset: frontAsset, label: t('item.problemSection') },
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
    const w = e.nativeEvent.layout.width;
    if (w > 0) setViewerW(w);
  };

  const viewerH = isLandscape
    ? Math.round(Math.min(layout.shortEdge * 0.88, layout.height - 120))
    : Math.min(layout.height * 0.55, viewerW * 1.25);
  const imageH = Math.max(120, viewerH - (isLandscape ? 12 : 28));

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
          {viewerW > 0 ? (
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
                  <View key={item.side} style={{ width: viewerW, height: viewerH }}>
                    <Text style={styles.sideLabel}>{item.label}</Text>
                    <View style={[styles.imageBox, { height: imageH }]}>
                      <ResolvedImage
                        uri={displayUri}
                        asset={item.asset}
                        preferPreview={false}
                        style={{ width: viewerW, height: imageH }}
                        resizeMode="contain"
                      />
                      {item.side === 'front' && layer ? (
                        <AnnotationCanvas
                          layer={layer}
                          tool={tool}
                          strokeWidth={strokeWidth}
                          visible
                          interactive={inkKind !== null}
                          onStrokesChange={onStrokesChange}
                          height={imageH}
                          style={[
                            styles.ink,
                            inkKind === null && styles.inkPassthrough,
                          ]}
                        />
                      ) : null}
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
  viewer: { flex: 1 },
  sideLabel: {
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.gray,
    marginBottom: 4,
    textAlign: 'center',
  },
  imageBox: { position: 'relative', overflow: 'hidden' },
  ink: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  inkPassthrough: { pointerEvents: 'none' as const },
  pager: { textAlign: 'center', color: theme.gray, marginTop: 8, fontWeight: '700' },
});
