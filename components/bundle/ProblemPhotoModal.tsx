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
import type { CloudAsset, InkToolId, NoteLayer } from '@/lib/domain/types';
import { getFullImageUri } from '@/lib/files/display-image-uri';
import { useFullscreenViewerLayout } from '@/lib/ui/fullscreen-viewer-layout';

type Side = 'front' | 'back';

type Props = {
  visible: boolean;
  frontAsset: CloudAsset;
  backAsset: CloudAsset | null;
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
  const [pageIndex, setPageIndex] = useState(0);
  const [viewerW, setViewerW] = useState(0);
  const [inkKind, setInkKind] = useState<PhotoInkToolKind>('pen');

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
    if (visible) setPageIndex(0);
  }, [visible]);

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

  const onSelectKind = (kind: PhotoInkToolKind) => {
    setInkKind(kind);
    if (kind === 'crop') {
      onCropRequest(sides[pageIndex]?.side ?? 'front');
      return;
    }
    if (kind === 'eraser') {
      onBeforeInkUse?.();
      onToolChange('eraser');
      flowApi.openKind('eraser');
      return;
    }
    if (kind === 'highlighter') {
      onBeforeInkUse?.();
      flowApi.openKind('highlighter');
      return;
    }
    onBeforeInkUse?.();
    flowApi.openKind('pen');
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

  const viewerH = Math.min(layout.height * 0.55, viewerW * 1.25);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>{t('common.close')}</Text>
          </Pressable>
          <Text style={styles.hint}>{t('item.swipeForBack')}</Text>
        </View>

        <PhotoInkToolbar activeKind={inkKind} tool={tool} onSelectKind={onSelectKind} />

        {flowApi.flow !== null && (
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
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScrollEnd}
            style={{ height: viewerH }}>
            {sides.map((item) => {
              const uri = getFullImageUri(item.asset);
              return (
                <View key={item.side} style={{ width: viewerW, height: viewerH }}>
                  <Text style={styles.sideLabel}>{item.label}</Text>
                  {uri ? (
                    <View style={styles.imageBox}>
                      <ResolvedImage
                        uri={uri}
                        asset={item.asset}
                        style={{ width: viewerW, height: viewerH - 28 }}
                        resizeMode="contain"
                      />
                      {item.side === 'front' && layer ? (
                        <AnnotationCanvas
                          layer={layer}
                          tool={tool}
                          strokeWidth={strokeWidth}
                          visible
                          onStrokesChange={onStrokesChange}
                          height={viewerH - 28}
                          style={styles.ink}
                        />
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
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
  imageBox: { position: 'relative', flex: 1 },
  ink: { position: 'absolute', left: 0, top: 28, right: 0, bottom: 0 },
  pager: { textAlign: 'center', color: theme.gray, marginTop: 8, fontWeight: '700' },
});
