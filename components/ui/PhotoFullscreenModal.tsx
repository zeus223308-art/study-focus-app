import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnnotationCanvas } from '@/components/annotation/AnnotationCanvas';
import { FullscreenInkControls } from '@/components/annotation/FullscreenInkControls';
import { useFullscreenInkFlow } from '@/components/annotation/use-fullscreen-ink-flow';
import { ResolvedImage } from '@/components/ui/ResolvedImage';
import { theme } from '@/constants/theme';
import { isHighlighterTool } from '@/lib/domain/ink-sizes';
import type { InkToolId, NoteLayer } from '@/lib/domain/types';
import { useFullscreenViewerLayout } from '@/lib/ui/fullscreen-viewer-layout';

type Side = 'front' | 'back';

type Props = {
  visible: boolean;
  frontUri: string;
  backUri?: string | null;
  initialSide?: Side;
  onClose: () => void;
  layer: NoteLayer | null;
  onStrokesChange: (strokes: NoteLayer['strokes']) => void;
  tool: InkToolId;
  penWidth: number;
  highlighterWidth: number;
  eraserWidth: number;
  onToolChange: (tool: InkToolId) => void;
  onPenWidthChange: (w: number) => void;
  onHighlighterWidthChange: (w: number) => void;
  onEraserWidthChange: (w: number) => void;
  onBeforeInkUse?: () => void;
};

export function PhotoFullscreenModal({
  visible,
  frontUri,
  backUri,
  initialSide = 'front',
  onClose,
  layer,
  onStrokesChange,
  tool,
  penWidth,
  highlighterWidth,
  eraserWidth,
  onToolChange,
  onPenWidthChange,
  onHighlighterWidthChange,
  onEraserWidthChange,
  onBeforeInkUse,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const layout = useFullscreenViewerLayout();
  const m = layout.metrics;
  const [side, setSide] = useState<Side>(initialSide);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

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
    if (visible) setSide(initialSide);
  }, [visible, initialSide]);

  useEffect(() => {
    if (!visible) setCanvasSize({ w: 0, h: 0 });
  }, [visible]);

  const displayUri = side === 'back' && backUri ? backUri : frontUri;
  const hasBack = Boolean(backUri);

  const strokeWidth = useMemo(() => {
    if (tool === 'eraser') return eraserWidth;
    if (isHighlighterTool(tool)) return highlighterWidth;
    return penWidth;
  }, [tool, penWidth, highlighterWidth, eraserWidth]);

  const onImageLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (w > 0 && h > 0) setCanvasSize({ w, h });
  };

  const inkProps = {
    tool,
    penWidth,
    highlighterWidth,
    eraserWidth,
    layout,
    flowApi,
  };

  const sideChips = hasBack ? (
    <View style={styles.sideRow}>
      <Pressable
        onPress={() => setSide('front')}
        style={[
          styles.sideChip,
          {
            paddingHorizontal: m.sideChipPaddingH,
            paddingVertical: m.sideChipPaddingV,
          },
          side === 'front' && styles.sideChipOn,
        ]}>
        <Text
          style={[
            styles.sideText,
            { fontSize: m.sideFontSize },
            side === 'front' && styles.sideTextOn,
          ]}>
          {t('capture.frontLabel')}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => setSide('back')}
        style={[
          styles.sideChip,
          {
            paddingHorizontal: m.sideChipPaddingH,
            paddingVertical: m.sideChipPaddingV,
          },
          side === 'back' && styles.sideChipOn,
        ]}>
        <Text
          style={[
            styles.sideText,
            { fontSize: m.sideFontSize },
            side === 'back' && styles.sideTextOn,
          ]}>
          {t('capture.backLabel')}
        </Text>
      </Pressable>
    </View>
  ) : null;

  const closeBtn = (
    <Pressable
      onPress={onClose}
      hitSlop={12}
      style={[
        styles.closeBtn,
        { width: m.topCloseSize, height: m.topCloseSize, borderRadius: m.topCloseSize / 2 },
      ]}>
      <SymbolView
        name={{ ios: 'xmark', android: 'close', web: 'close' }}
        size={layout.isPhone ? 22 : 26}
        tintColor={theme.white}
      />
    </Pressable>
  );

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View
        style={[
          styles.root,
          {
            paddingTop: insets.top + (layout.isPhone ? 4 : 8),
            paddingBottom: insets.bottom + (layout.isPhone ? 4 : 8),
            paddingHorizontal: layout.isPhone ? 0 : 8,
          },
        ]}>
        {layout.useUnifiedTopBar ? (
          <>
            <View style={[styles.unifiedTopBar, { paddingHorizontal: layout.isTablet ? 16 : 12 }]}>
              <View style={styles.unifiedLeading}>{sideChips}</View>
              <View style={styles.unifiedCenter}>
                <FullscreenInkControls {...inkProps} kindOnly />
              </View>
              <View style={styles.unifiedTrailing}>{closeBtn}</View>
            </View>
            <FullscreenInkControls {...inkProps} pickerOnly />
          </>
        ) : (
          <>
            <View
              style={[
                styles.topBar,
                { paddingHorizontal: layout.isPhone ? 12 : 20, marginBottom: layout.isPhone ? 4 : 8 },
              ]}>
              {hasBack ? sideChips : <View style={styles.sideSpacer} />}
              {closeBtn}
            </View>
            <FullscreenInkControls {...inkProps} />
          </>
        )}

        <View
          style={[
            styles.imageArea,
            {
              paddingHorizontal: layout.isPhone ? 8 : 16,
              maxWidth: layout.imageMaxWidth,
              alignSelf: 'center',
              width: '100%',
            },
          ]}
          onLayout={onImageLayout}>
          <ResolvedImage uri={displayUri} style={styles.image} resizeMode="contain" />
          {layer && canvasSize.h > 0 ? (
            <AnnotationCanvas
              layer={layer}
              tool={tool}
              strokeWidth={strokeWidth}
              visible
              onStrokesChange={onStrokesChange}
              height={canvasSize.h}
              style={[styles.annotationOverlay, { width: canvasSize.w, height: canvasSize.h }]}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unifiedTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    minHeight: 48,
  },
  unifiedLeading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  unifiedCenter: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  unifiedTrailing: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  sideSpacer: { flex: 1 },
  sideRow: { flexDirection: 'row', gap: 8 },
  sideChip: {
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  sideChipOn: { backgroundColor: theme.orange, borderColor: theme.orange },
  sideText: { fontWeight: '700', color: theme.white },
  sideTextOn: { color: theme.white },
  closeBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 120,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  annotationOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
