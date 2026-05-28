import * as ImageManipulator from 'expo-image-manipulator';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { CaptureEditSurface } from '@/components/capture/CaptureEditSurface';
import { CaptureInkBakeHost, type InkBakeJob } from '@/components/capture/CaptureInkBakeHost';
import { theme } from '@/constants/theme';
import { defaultWidthForTool } from '@/lib/domain/ink-sizes';
import type { InkStroke, InkToolId } from '@/lib/domain/types';
import {
  bakeStrokesOntoImageUri,
  captureDisplayRect,
  mapStrokesToCroppedImage,
  mapStrokesToFullImage,
} from '@/lib/files/bake-capture-ink';
import type { CropSelection } from '@/lib/files/interactive-crop';
import { cropRegionFromSelection, exportCropSelection } from '@/lib/files/interactive-crop';
import { resolveImageUriForProcessing } from '@/hooks/useResolvedImageUri';
import { useFullscreenViewerLayout } from '@/lib/ui/fullscreen-viewer-layout';
import { isHighlighterTool } from '@/lib/domain/ink-sizes';
import { useResolvedImageUri } from '@/hooks/useResolvedImageUri';
import { showMessage } from '@/lib/ui/confirm';

type EditorMode = 'crop' | 'draw';

type Props = {
  uri: string;
  sideLabel: string;
  onConfirm: (result: { uri: string }) => void | Promise<void>;
  onRetake: () => void;
  lockImagePosition?: boolean;
};

export function CapturePhotoEditor({
  uri,
  sideLabel,
  onConfirm,
  onRetake,
  lockImagePosition = false,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const layout = useFullscreenViewerLayout();
  const [workingUri, setWorkingUri] = useState(uri);
  const displayUri = useResolvedImageUri(workingUri);

  useEffect(() => {
    setWorkingUri(uri);
    cropSelectionRef.current = null;
    setCropSelection(null);
    setCropReady(false);
  }, [uri]);
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
      let sourceUri = await resolveImageUriForProcessing(workingUri);
      if (selection && display && strokes.length > 0) {
        const baked = mapStrokesToFullImage(strokes, selection, display);
        if (baked.length > 0) {
          if (Platform.OS === 'web') {
            sourceUri = await bakeStrokesOntoImageUri(
              sourceUri,
              baked,
              selection.imageWidth,
              selection.imageHeight
            );
          } else {
            try {
              sourceUri = await bakeNative(sourceUri, baked, selection.imageWidth, selection.imageHeight);
            } catch {
              /* keep unbaked */
            }
          }
        }
      }

      const result = await ImageManipulator.manipulateAsync(
        sourceUri,
        [{ rotate: 90 }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );

      setStrokes([]);
      setSeedSelection(null);
      applyCropSelection(null);
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
    if (!selection) {
      showMessage(t('capture.cropDragRegionHint'));
      return;
    }
    setBusy(true);
    try {
      const sourceUri = await resolveImageUriForProcessing(workingUri);
      const croppedUri = await exportCropSelection(sourceUri, selection);
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

      await onConfirm({ uri: finalUri });
    } catch {
      showMessage(t('capture.saveFailedKeepDraft'));
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

      <View style={styles.toolRow}>
        <Pressable
          style={[styles.toolChip, mode === 'crop' && styles.toolChipOn]}
          onPress={() => setMode('crop')}
          disabled={busy}>
          <Text style={[styles.toolChipText, mode === 'crop' && styles.toolChipTextOn]}>
            {t('capture.toolCrop')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toolChip, mode === 'draw' && styles.toolChipOn]}
          onPress={() => setMode('draw')}
          disabled={busy}>
          <Text style={[styles.toolChipText, mode === 'draw' && styles.toolChipTextOn]}>
            {t('capture.toolDraw')}
          </Text>
        </Pressable>
        <Pressable style={styles.toolChip} onPress={busy ? undefined : rotate} disabled={busy}>
          <Text style={styles.toolChipText}>{t('capture.toolRotate')}</Text>
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
        {displayUri ? (
          <CaptureEditSurface
            key={workingUri}
            uri={displayUri}
            mode={mode}
            selection={cropSelection}
            onSelectionChange={applyCropSelection}
            seedSelection={seedSelection}
            onSeedApplied={() => setSeedSelection(null)}
            strokes={strokes}
            tool={tool}
            strokeWidth={strokeWidth}
            onStrokesChange={setStrokes}
            lockImagePosition={lockImagePosition}
          />
        ) : (
          <View style={styles.cropWrapLoading} />
        )}
        {busy ? (
          <View style={styles.busy}>
            <ActivityIndicator color={theme.white} size="large" />
          </View>
        ) : null}
        <Text style={styles.hint}>
          {mode === 'crop' ? t('capture.cropDragRegionHint') : t('capture.drawInkHint')}
        </Text>
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
  cropWrapLoading: { flex: 1, backgroundColor: '#000' },
  busy: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  toolRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  toolChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  toolChipOn: { backgroundColor: theme.orange },
  toolChipText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700' },
  toolChipTextOn: { color: theme.white },
  hint: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 8,
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 16,
    pointerEvents: 'none',
  },
});
