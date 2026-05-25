import * as ImageManipulator from 'expo-image-manipulator';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FullscreenInkControls } from '@/components/annotation/FullscreenInkControls';
import { useFullscreenInkFlow } from '@/components/annotation/use-fullscreen-ink-flow';
import { CaptureDrawSurface } from '@/components/capture/CaptureDrawSurface';
import { CaptureInkBakeHost, type InkBakeJob } from '@/components/capture/CaptureInkBakeHost';
import { CaptureInteractiveCrop } from '@/components/capture/CaptureInteractiveCrop';
import { theme } from '@/constants/theme';
import { defaultWidthForTool } from '@/lib/domain/ink-sizes';
import type { InkStroke, InkToolId } from '@/lib/domain/types';
import {
  bakeStrokesOntoImageUri,
  captureDisplayRect,
  mapStrokesToCroppedImage,
} from '@/lib/files/bake-capture-ink';
import type { CropSelection } from '@/lib/files/interactive-crop';
import { cropRegionFromSelection, exportCropSelection } from '@/lib/files/interactive-crop';
import {
  rotateCropSelectionCW90,
  rotateStrokesCW90,
} from '@/lib/files/rotate-capture-edit';
import { useFullscreenViewerLayout } from '@/lib/ui/fullscreen-viewer-layout';
import { isHighlighterTool } from '@/lib/domain/ink-sizes';

type EditorMode = 'crop' | 'draw';

type Props = {
  uri: string;
  sideLabel: string;
  onConfirm: (result: { uri: string }) => void;
  onRetake: () => void;
};

export function CapturePhotoEditor({ uri, sideLabel, onConfirm, onRetake }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const layout = useFullscreenViewerLayout();
  const [workingUri, setWorkingUri] = useState(uri);
  const [busy, setBusy] = useState(false);
  const [cropReady, setCropReady] = useState(false);
  const [mode, setMode] = useState<EditorMode>('crop');
  const [strokes, setStrokes] = useState<InkStroke[]>([]);
  const [tool, setTool] = useState<InkToolId>('pen-black');
  const [penWidth, setPenWidth] = useState(defaultWidthForTool('pen-black'));
  const [highlighterWidth, setHighlighterWidth] = useState(defaultWidthForTool('hi-yellow'));
  const [eraserWidth, setEraserWidth] = useState(defaultWidthForTool('eraser'));
  const [cropSelection, setCropSelection] = useState<CropSelection | null>(null);
  const [seedSelection, setSeedSelection] = useState<CropSelection | null>(null);
  const cropSelectionRef = useRef<CropSelection | null>(null);
  const [bakeJob, setBakeJob] = useState<InkBakeJob | null>(null);
  const bakeResolveRef = useRef<((uri: string) => void) | null>(null);
  const bakeRejectRef = useRef<(() => void) | null>(null);

  const flowApi = useFullscreenInkFlow({
    visible: mode === 'draw',
    tool,
    onToolChange: setTool,
    onPenWidthChange: setPenWidth,
    onHighlighterWidthChange: setHighlighterWidth,
    onEraserWidthChange: setEraserWidth,
  });

  const strokeWidth = useMemo(() => {
    if (tool === 'eraser') return eraserWidth;
    if (isHighlighterTool(tool)) return highlighterWidth;
    return penWidth;
  }, [tool, penWidth, highlighterWidth, eraserWidth]);

  const inkProps = {
    tool,
    penWidth,
    highlighterWidth,
    eraserWidth,
    layout,
    flowApi,
  };

  const applyCropSelection = useCallback((next: CropSelection | null) => {
    cropSelectionRef.current = next;
    setCropSelection(next);
    setCropReady(Boolean(next));
  }, []);

  const rotate = async () => {
    const selection = cropSelectionRef.current;
    const display = selection ? captureDisplayRect(selection) : null;
    setBusy(true);
    try {
      const result = await ImageManipulator.manipulateAsync(
        workingUri,
        [{ rotate: 90 }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );
      const nextStrokes =
        display && strokes.length > 0
          ? rotateStrokesCW90(strokes, display.width)
          : strokes;
      const nextSelection = selection ? rotateCropSelectionCW90(selection) : null;

      setStrokes(nextStrokes);
      if (nextSelection) {
        setSeedSelection(nextSelection);
        applyCropSelection(nextSelection);
      } else {
        setSeedSelection(null);
        applyCropSelection(null);
      }
      setWorkingUri(result.uri);
    } finally {
      setBusy(false);
    }
  };

  const undoStroke = () => {
    setStrokes((prev) => prev.slice(0, -1));
  };

  const bakeNative = useCallback(
    (uri: string, mapped: InkStroke[], width: number, height: number) =>
      new Promise<string>((resolve, reject) => {
        bakeResolveRef.current = resolve;
        bakeRejectRef.current = reject;
        setBakeJob({ uri, strokes: mapped, width, height });
      }),
    []
  );

  const onBakeComplete = useCallback(
    (uri: string) => {
      bakeResolveRef.current?.(uri);
      bakeResolveRef.current = null;
      bakeRejectRef.current = null;
      setBakeJob(null);
    },
    []
  );

  const onBakeError = useCallback(() => {
    bakeRejectRef.current?.();
    bakeResolveRef.current = null;
    bakeRejectRef.current = null;
    setBakeJob(null);
  }, []);

  const confirm = async () => {
    const selection = cropSelectionRef.current;
    if (!selection) return;
    setBusy(true);
    try {
      const croppedUri = await exportCropSelection(workingUri, selection);
      const region = cropRegionFromSelection(selection);
      let finalUri = croppedUri;

      if (strokes.length > 0) {
        const display = captureDisplayRect(selection);
        const mapped = mapStrokesToCroppedImage(strokes, selection, {
          left: display.left,
          top: display.top,
          width: display.width,
          height: display.height,
        });
        if (mapped.length > 0) {
          if (Platform.OS === 'web') {
            finalUri = await bakeStrokesOntoImageUri(
              croppedUri,
              mapped,
              region.width,
              region.height
            );
          } else {
            try {
              finalUri = await bakeNative(croppedUri, mapped, region.width, region.height);
            } catch {
              finalUri = croppedUri;
            }
          }
        }
      }

      onConfirm({ uri: finalUri });
    } finally {
      setBusy(false);
    }
  };

  const canUndo = strokes.length > 0;

  return (
    <View style={styles.root}>
      <CaptureInkBakeHost job={bakeJob} onComplete={onBakeComplete} onError={onBakeError} />
      <View style={[styles.topBar, { paddingTop: insets.top + 6, paddingBottom: 10 }]}>
        <Pressable onPress={busy ? undefined : onRetake} hitSlop={12} style={styles.topAction}>
          <Text style={styles.cancelText}>{t('capture.editorCancel')}</Text>
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>
          {sideLabel}
        </Text>
        <Pressable
          onPress={busy || !cropReady ? undefined : confirm}
          hitSlop={12}
          style={styles.topAction}>
          <Text style={[styles.doneText, (busy || !cropReady) && styles.doneDisabled]}>
            {t('capture.editorDone')}
          </Text>
        </Pressable>
      </View>

      {mode === 'draw' ? (
        <View style={styles.inkBar}>
          <FullscreenInkControls {...inkProps} />
          {canUndo ? (
            <Pressable onPress={undoStroke} style={styles.undoBtn}>
              <Text style={styles.undoText}>{t('capture.editorUndo')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.cropWrap}>
        {mode === 'crop' ? (
          <CaptureInteractiveCrop
            key={workingUri}
            uri={workingUri}
            seedSelection={seedSelection}
            onSeedApplied={() => setSeedSelection(null)}
            onSelectionChange={applyCropSelection}
          />
        ) : (
          <CaptureDrawSurface
            key={workingUri}
            uri={workingUri}
            tool={tool}
            strokeWidth={strokeWidth}
            strokes={strokes}
            onStrokesChange={setStrokes}
            selection={cropSelection}
            seedSelection={seedSelection}
            onSeedApplied={() => setSeedSelection(null)}
            onSelectionChange={applyCropSelection}
          />
        )}
        {busy ? (
          <View style={styles.busy}>
            <ActivityIndicator color={theme.white} size="large" />
          </View>
        ) : null}
      </View>

      {mode === 'crop' ? (
        <Text style={styles.hint}>{t('capture.cropDragRegionHint')}</Text>
      ) : (
        <Text style={styles.hint}>{t('capture.drawInkHint')}</Text>
      )}

      <View style={[styles.toolBar, { paddingBottom: Math.max(14, insets.bottom + 8) }]}>
        <Pressable
          style={[styles.toolItem, mode === 'crop' && styles.toolActive]}
          onPress={() => setMode('crop')}>
          <Text style={[styles.toolLabel, mode === 'crop' && styles.toolLabelActive]}>
            {t('capture.toolCrop')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toolItem, mode === 'draw' && styles.toolActive]}
          onPress={() => setMode('draw')}>
          <Text style={[styles.toolLabel, mode === 'draw' && styles.toolLabelActive]}>
            {t('capture.toolDraw')}
          </Text>
        </Pressable>
        <Pressable style={styles.toolItem} onPress={busy ? undefined : rotate} disabled={busy}>
          <Text style={styles.toolLabel}>{t('capture.toolRotate')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.blackPure },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  topAction: { minWidth: 56, paddingVertical: 6 },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 8,
  },
  cancelText: { color: theme.white, fontSize: 16, fontWeight: '600' },
  doneText: { color: theme.orange, fontSize: 16, fontWeight: '800', textAlign: 'right' },
  doneDisabled: { opacity: 0.4 },
  inkBar: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  undoBtn: { marginTop: 6, paddingVertical: 4, paddingHorizontal: 12 },
  undoText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '700' },
  cropWrap: { flex: 1, position: 'relative' },
  busy: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  hint: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  toolBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 22,
    paddingTop: 14,
    backgroundColor: '#141414',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  toolItem: { alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 },
  toolActive: { borderBottomWidth: 2, borderBottomColor: theme.orange },
  toolLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '600' },
  toolLabelActive: { color: theme.white },
});
