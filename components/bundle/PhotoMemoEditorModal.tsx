import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnnotationCanvas } from '@/components/annotation/AnnotationCanvas';
import { MemoTextBoxView } from '@/components/annotation/MemoTextBox';
import { FullscreenInkControls } from '@/components/annotation/FullscreenInkControls';
import { useFullscreenInkFlow } from '@/components/annotation/use-fullscreen-ink-flow';
import { PhotoMemoToolbar, type PhotoMemoToolKind } from '@/components/bundle/PhotoMemoToolbar';
import { ResolvedImage } from '@/components/ui/ResolvedImage';
import { theme } from '@/constants/theme';
import {
  ERASER_WIDTHS,
  HIGHLIGHTER_WIDTHS,
  PEN_WIDTHS,
  isHighlighterTool,
} from '@/lib/domain/ink-sizes';
import { normalizePhotoMemo } from '@/lib/domain/photo-memo';
import type { CloudAsset, InkToolId, MemoTextBox, NoteLayer, PhotoMemo } from '@/lib/domain/types';
import { getFullImageUri, getPreviewImageUri } from '@/lib/files/display-image-uri';
import { useFullscreenViewerLayout } from '@/lib/ui/fullscreen-viewer-layout';

type Props = {
  visible: boolean;
  sideLabel: string;
  asset: CloudAsset;
  memo: PhotoMemo;
  onMemoChange: (memo: PhotoMemo) => void;
  onClose: () => void;
};

function memoToLayer(memo: PhotoMemo): NoteLayer {
  const now = memo.updatedAt;
  return {
    id: 'photo_memo_layer',
    studyDate: '',
    visible: true,
    strokes: memo.strokes,
    scratchpadOffsetY: 0,
    scratchpadHeight: 0,
    note: '',
    createdAt: now,
    updatedAt: now,
  };
}

export function PhotoMemoEditorModal({
  visible,
  sideLabel,
  asset,
  memo: memoProp,
  onMemoChange,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const layout = useFullscreenViewerLayout();
  const { isLandscape } = layout;
  const [viewerW, setViewerW] = useState(0);
  const [inkKind, setInkKind] = useState<PhotoMemoToolKind | null>(null);
  const [tool, setTool] = useState<InkToolId>('pen-black');
  const [penWidth, setPenWidth] = useState<number>(PEN_WIDTHS[1]);
  const [highlighterWidth, setHighlighterWidth] = useState<number>(HIGHLIGHTER_WIDTHS[1]);
  const [eraserWidth, setEraserWidth] = useState<number>(ERASER_WIDTHS[1]);
  const [activeBoxId, setActiveBoxId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState(false);

  const memo = normalizePhotoMemo(memoProp);
  const layer = useMemo(() => memoToLayer(memo), [memo]);

  const flowApi = useFullscreenInkFlow({
    visible,
    tool,
    onToolChange: setTool,
    onPenWidthChange: setPenWidth,
    onHighlighterWidthChange: setHighlighterWidth,
    onEraserWidthChange: setEraserWidth,
  });

  useEffect(() => {
    if (visible) {
      setInkKind(null);
      setActiveBoxId(null);
      setEditingText(false);
    }
  }, [visible]);

  const strokeWidth = useMemo(() => {
    if (tool === 'eraser') return eraserWidth;
    if (isHighlighterTool(tool)) return highlighterWidth;
    return penWidth;
  }, [tool, penWidth, highlighterWidth, eraserWidth]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setViewerW(w);
  };

  const viewerH = isLandscape
    ? Math.round(Math.min(layout.shortEdge * 0.9, layout.height - 140))
    : Math.min(layout.height * 0.58, viewerW * 1.25);
  const imageH = Math.max(120, viewerH - (isLandscape ? 4 : 8));
  const displayUri = getPreviewImageUri(asset) ?? getFullImageUri(asset);

  const patchMemo = (patch: Partial<PhotoMemo>) => {
    onMemoChange({
      ...memo,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  };

  const onSelectKind = (kind: PhotoMemoToolKind) => {
    setInkKind(kind);
    if (kind === 'text') {
      setEditingText(false);
      setActiveBoxId(null);
      if (memo.textBoxes.length === 0) addTextBox();
      return;
    }
    setEditingText(false);
    setActiveBoxId(null);
    if (kind === 'eraser') {
      setTool('eraser');
      flowApi.openKind('eraser');
      return;
    }
    if (kind === 'highlighter') {
      flowApi.openKind('highlighter');
      return;
    }
    flowApi.openKind('pen');
  };

  const addTextBox = () => {
    const id = `tb_${Date.now()}`;
    const box: MemoTextBox = {
      id,
      x: viewerW * 0.08,
      y: imageH * 0.15,
      width: Math.min(180, viewerW * 0.55),
      height: 56,
      text: '',
    };
    patchMemo({ textBoxes: [...memo.textBoxes, box] });
    setActiveBoxId(id);
    setEditingText(true);
    setInkKind('text');
  };

  const updateBox = (id: string, patch: Partial<MemoTextBox>) => {
    patchMemo({
      textBoxes: memo.textBoxes.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    });
  };

  const dismissTextEditing = () => {
    setEditingText(false);
    setActiveBoxId(null);
    Keyboard.dismiss();
  };

  const inkInteractive = inkKind !== null && inkKind !== 'text';
  const textInteractive = inkKind === 'text';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>{t('common.close')}</Text>
          </Pressable>
          <Text style={styles.title}>{sideLabel}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.done}>{t('common.done')}</Text>
          </Pressable>
        </View>

        <PhotoMemoToolbar activeKind={inkKind} onSelectKind={onSelectKind} />

        {inkKind !== null && inkKind !== 'text' && flowApi.flow !== null ? (
          <FullscreenInkControls
            tool={tool}
            penWidth={penWidth}
            highlighterWidth={highlighterWidth}
            eraserWidth={eraserWidth}
            layout={layout}
            flowApi={flowApi}
            pickerOnly
          />
        ) : null}

        {inkKind === 'text' ? (
          <View style={styles.textActions}>
            <Pressable onPress={addTextBox} style={styles.addTextBtn}>
              <Text style={styles.addTextLabel}>+ {t('review.workText')}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.viewer} onLayout={onLayout}>
          {viewerW > 0 && displayUri ? (
            <View style={[styles.imageBox, { width: viewerW, height: imageH }]}>
              <ResolvedImage
                uri={displayUri}
                asset={asset}
                preferPreview={false}
                style={{ width: viewerW, height: imageH }}
                resizeMode="contain"
              />
              <AnnotationCanvas
                layer={layer}
                tool={tool}
                strokeWidth={strokeWidth}
                visible
                interactive={inkInteractive}
                onStrokesChange={(strokes) => patchMemo({ strokes })}
                height={imageH}
                style={[styles.ink, !inkInteractive && styles.inkPassthrough]}
              />
              {editingText ? (
                <Pressable style={styles.dismissBackdrop} onPress={dismissTextEditing} />
              ) : null}
              {memo.textBoxes.map((box) => (
                <MemoTextBoxView
                  key={box.id}
                  box={box}
                  active={activeBoxId === box.id}
                  editing={editingText && activeBoxId === box.id}
                  interactive={textInteractive}
                  surfaceWidth={viewerW}
                  surfaceHeight={imageH}
                  placeholder={t('review.textBoxPlaceholder')}
                  onChange={(patch) => updateBox(box.id, patch)}
                  onActivate={() => {
                    setActiveBoxId(box.id);
                    setEditingText(true);
                  }}
                  onRemove={() => {
                    patchMemo({ textBoxes: memo.textBoxes.filter((b) => b.id !== box.id) });
                    dismissTextEditing();
                  }}
                />
              ))}
            </View>
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
  close: { color: theme.orange, fontWeight: '800', fontSize: theme.font.body, minWidth: 48 },
  title: { fontSize: theme.font.body, fontWeight: '800', color: theme.black },
  done: { color: theme.orange, fontWeight: '800', fontSize: theme.font.body, minWidth: 48, textAlign: 'right' },
  textActions: { marginBottom: 8, alignItems: 'flex-end' },
  addTextBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.orangeSoft,
  },
  addTextLabel: { color: theme.orange, fontWeight: '800', fontSize: theme.font.caption },
  viewer: { flex: 1 },
  imageBox: { position: 'relative', overflow: 'hidden', alignSelf: 'center' },
  ink: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  inkPassthrough: { pointerEvents: 'none' as const },
  dismissBackdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
  },
});
