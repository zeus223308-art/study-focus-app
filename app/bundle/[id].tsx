import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FullscreenInkControls } from '@/components/annotation/FullscreenInkControls';
import { useFullscreenInkFlow } from '@/components/annotation/use-fullscreen-ink-flow';
import { ArchiveSubjectPickerModal } from '@/components/bundle/ArchiveSubjectPickerModal';
import { BundlePhotoBlock } from '@/components/bundle/BundlePhotoBlock';
import { PhotoCropModal } from '@/components/bundle/PhotoCropModal';
import { PhotoInkToolbar, type PhotoInkToolKind } from '@/components/bundle/PhotoInkToolbar';
import { PhotoMemoEditorModal } from '@/components/bundle/PhotoMemoEditorModal';
import { ProblemPhotoModal } from '@/components/bundle/ProblemPhotoModal';
import { Button } from '@/components/ui/Button';
import { NotFoundView } from '@/components/ui/NotFoundView';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { attachAnswerToPage } from '@/lib/domain/attach-answer';
import { replacePageAnswerPhoto, replacePageFrontPhoto } from '@/lib/files/replace-page-photo';
import { getFullImageUri } from '@/lib/files/display-image-uri';
import { IMAGE_CAPTURE_QUALITY } from '@/lib/files/image-quality';
import {
  ERASER_WIDTHS,
  HIGHLIGHTER_WIDTHS,
  PEN_WIDTHS,
  isHighlighterTool,
} from '@/lib/domain/ink-sizes';
import { hasPhotoMemoContent, normalizePhotoMemo } from '@/lib/domain/photo-memo';
import type { InkToolId, NoteLayer, PhotoMemo } from '@/lib/domain/types';
import { safeRouterBack } from '@/lib/navigation/safe-back';
import { getAnswerImageUri } from '@/lib/review/answer-text';
import { confirmDestructive, showMessage } from '@/lib/ui/confirm';
import { useFullscreenViewerLayout } from '@/lib/ui/fullscreen-viewer-layout';
import { computeBundlePhotoLayout, useViewportLayout } from '@/lib/ui/viewport-layout';

function newLayer(studyDate: string): NoteLayer {
  const now = new Date().toISOString();
  return {
    id: `layer_${Date.now()}`,
    studyDate,
    visible: true,
    strokes: [],
    scratchpadOffsetY: 0,
    scratchpadHeight: 200,
    note: '',
    createdAt: now,
    updatedAt: now,
  };
}

export default function BundleScreen() {
  const { id, pageId } = useLocalSearchParams<{ id: string; pageId?: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const {
    data,
    storage,
    updateBundle,
    archiveBundle,
    unarchiveBundle,
    moveBundleToTrash,
    deletePage,
    applyLayerCycleChoice,
  } = useApp();
  const bundle = data.bundles.find((b) => b.id === id);
  const initialPageIndex = useMemo(() => {
    if (!bundle || !pageId) return 0;
    const i = bundle.pages.findIndex((p) => p.id === pageId);
    return i >= 0 ? i : 0;
  }, [bundle?.id, pageId]);
  const [pageIndex, setPageIndex] = useState(initialPageIndex);
  const [tool, setTool] = useState<InkToolId>('pen-black');
  const [penWidth, setPenWidth] = useState<number>(PEN_WIDTHS[1]);
  const [highlighterWidth, setHighlighterWidth] = useState<number>(HIGHLIGHTER_WIDTHS[1]);
  const [eraserWidth, setEraserWidth] = useState<number>(ERASER_WIDTHS[1]);
  const [problemModalOpen, setProblemModalOpen] = useState(false);
  const [editAnswer, setEditAnswer] = useState(false);
  const [answerInkKind, setAnswerInkKind] = useState<PhotoInkToolKind | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropUri, setCropUri] = useState('');
  const [cropSide, setCropSide] = useState<'front' | 'back'>('front');
  const [archivePickerOpen, setArchivePickerOpen] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);
  const [memoSide, setMemoSide] = useState<'front' | 'back'>('front');
  const [undoStack, setUndoStack] = useState<NoteLayer['strokes'][]>([]);
  const [redoStack, setRedoStack] = useState<NoteLayer['strokes'][]>([]);
  const viewport = useViewportLayout();
  const viewerLayout = useFullscreenViewerLayout();
  const photoLayout = computeBundlePhotoLayout(viewport);

  const page = bundle?.pages[pageIndex] ?? bundle?.pages[0];
  const strokeWidth = useMemo(() => {
    if (tool === 'eraser') return eraserWidth;
    if (isHighlighterTool(tool)) return highlighterWidth;
    return penWidth;
  }, [tool, penWidth, highlighterWidth, eraserWidth]);

  const activeLayer = useMemo(
    () => page?.layers[page.layers.length - 1],
    [page?.layers]
  );

  useEffect(() => {
    setPageIndex(initialPageIndex);
  }, [initialPageIndex]);


  useEffect(() => {
    if (!bundle) return;
    setPageIndex((i) => Math.min(i, Math.max(0, bundle.pages.length - 1)));
  }, [bundle?.id, bundle?.pages.length]);

  const persistEditsRef = useRef<() => void>(() => {});
  persistEditsRef.current = () => {};

  useFocusEffect(
    useCallback(() => {
      return () => persistEditsRef.current();
    }, [bundle?.id, page?.id])
  );

  if (!bundle || !page) {
    return (
      <Screen>
        <NotFoundView backFallback="/(tabs)/vault" />
      </Screen>
    );
  }

  const folderBack: { pathname: '/folder/[id]'; params: { id: string } } = {
    pathname: '/folder/[id]',
    params: { id: bundle.subjectId },
  };

  const openCrop = (side: 'front' | 'back') => {
    const uri =
      side === 'front' ? getFullImageUri(page.asset) : getFullImageUri(page.answerAsset);
    if (!uri) return;
    setCropSide(side);
    setCropUri(uri);
    setCropOpen(true);
  };

  const onCropDone = async (uri: string) => {
    const updated =
      cropSide === 'front'
        ? await replacePageFrontPhoto(storage, page, bundle.id, uri)
        : await replacePageAnswerPhoto(storage, page, bundle.id, uri);
    updateBundle(bundle.id, {
      pages: bundle.pages.map((p) => (p.id === page.id ? updated : p)),
    });
  };

  const confirmDeleteCurrentPage = () => {
    const isLast = bundle.pages.length <= 1;
    confirmDestructive({
      title: t('item.deletePhotoTitle'),
      message: isLast ? t('item.deleteLastPhotoMessage') : t('item.deletePhotoMessage'),
      cancelLabel: t('common.cancel'),
      confirmLabel: t('item.deletePhoto'),
      onConfirm: () => {
        const bundleId = bundle.id;
        const pageId = page.id;
        persistEditsRef.current = () => {};
        safeRouterBack(router, folderBack);
        deletePage(bundleId, pageId);
      },
    });
  };

  const pushUndo = (strokes: NoteLayer['strokes']) => {
    setUndoStack((s) => [...s.slice(-30), strokes]);
    setRedoStack([]);
  };

  const updateLayerStrokes = (strokes: NoteLayer['strokes']) => {
    if (!activeLayer) return;
    pushUndo(activeLayer.strokes);
    const layers = page.layers.map((l) =>
      l.id === activeLayer.id ? { ...l, strokes, updatedAt: new Date().toISOString() } : l
    );
    updateBundle(bundle.id, {
      pages: bundle.pages.map((p) => (p.id === page.id ? { ...p, layers } : p)),
    });
  };

  const undo = () => {
    if (!activeLayer || undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((r) => [...r, activeLayer.strokes]);
    updateBundle(bundle.id, {
      pages: bundle.pages.map((p) =>
        p.id === page.id
          ? {
              ...p,
              layers: p.layers.map((l) =>
                l.id === activeLayer.id ? { ...l, strokes: prev } : l
              ),
            }
          : p
      ),
    });
  };

  const redo = () => {
    if (!activeLayer || redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((r) => r.slice(0, -1));
    setUndoStack((s) => [...s, activeLayer.strokes]);
    updateBundle(bundle.id, {
      pages: bundle.pages.map((p) =>
        p.id === page.id
          ? {
              ...p,
              layers: p.layers.map((l) =>
                l.id === activeLayer.id ? { ...l, strokes: next } : l
              ),
            }
          : p
      ),
    });
  };

  const onAddLayer = () => {
    Alert.alert(t('item.resetReviewTitle'), '', [
      {
        text: t('item.keepCycle'),
        onPress: () => {
          applyLayerCycleChoice(bundle.id, 'maintain');
          addLayer();
        },
      },
      {
        text: t('item.resetCycle'),
        onPress: () => {
          applyLayerCycleChoice(bundle.id, 'reset');
          addLayer();
        },
      },
    ]);
  };

  const addLayer = () => {
    const layer = newLayer(bundle.studyDate);
    updateBundle(bundle.id, {
      pages: bundle.pages.map((p) =>
        p.id === page.id ? { ...p, layers: [...p.layers, layer] } : p
      ),
    });
  };

  const ensureLayer = () => {
    if (!activeLayer) addLayer();
  };

  const answerInkFlow = useFullscreenInkFlow({
    visible: editAnswer,
    tool,
    onToolChange: setTool,
    onPenWidthChange: setPenWidth,
    onHighlighterWidthChange: setHighlighterWidth,
    onEraserWidthChange: setEraserWidth,
    onBeforeInkUse: ensureLayer,
  });

  const onSelectAnswerInk = (kind: PhotoInkToolKind) => {
    setAnswerInkKind(kind);
    if (kind === 'crop') {
      openCrop(page.answerAsset ? 'back' : 'front');
      return;
    }
    if (kind === 'eraser') {
      ensureLayer();
      setTool('eraser');
      answerInkFlow.openKind('eraser');
      return;
    }
    if (kind === 'highlighter') {
      ensureLayer();
      answerInkFlow.openKind('highlighter');
      return;
    }
    ensureLayer();
    answerInkFlow.openKind('pen');
  };

  const addBackPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('', t('folder.importPermission'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: IMAGE_CAPTURE_QUALITY,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    const updated = await attachAnswerToPage(storage, page, bundle.id, result.assets[0].uri);
    updateBundle(bundle.id, {
      pages: bundle.pages.map((p) => (p.id === page.id ? updated : p)),
    });
  };

  const frontMemo = normalizePhotoMemo(page.frontMemo);
  const answerMemo = normalizePhotoMemo(page.answerMemo);

  const updatePageMemo = (side: 'front' | 'back', memo: PhotoMemo) => {
    const key = side === 'front' ? 'frontMemo' : 'answerMemo';
    updateBundle(bundle.id, {
      pages: bundle.pages.map((p) =>
        p.id === page.id ? { ...p, [key]: memo, updatedAt: new Date().toISOString() } : p
      ),
    });
  };

  const openMemoEditor = (side: 'front' | 'back') => {
    if (side === 'back' && !page.answerAsset) return;
    setMemoSide(side);
    setMemoOpen(true);
  };

  const subject = data.subjects.find((s) => s.id === bundle.subjectId);

  return (
    <Screen scroll nestedScrollEnabled>
      <ScreenHeader
        title={subject?.name ?? bundle.studyDate}
        showBack
        backFallback={folderBack}
        showSettings={false}
      />
      <View style={styles.titleBlock}>
        <Text style={styles.titleLabel}>{t('item.cardTitle')}</Text>
        <TextInput
          style={styles.titleInput}
          value={bundle.title}
          onChangeText={(text) => updateBundle(bundle.id, { title: text })}
          maxLength={80}
        />
        <Text style={styles.studyDateLine}>{bundle.studyDate}</Text>
      </View>

      {editAnswer ? (
        <>
          <PhotoInkToolbar activeKind={answerInkKind} onSelectKind={onSelectAnswerInk} />
          {answerInkFlow.flow !== null && (
            <FullscreenInkControls
              tool={tool}
              penWidth={penWidth}
              highlighterWidth={highlighterWidth}
              eraserWidth={eraserWidth}
              layout={viewerLayout}
              flowApi={answerInkFlow}
              pickerOnly
            />
          )}
          <View style={styles.toolRow}>
            <Pressable onPress={undo}>
              <Text style={styles.link}>Undo</Text>
            </Pressable>
            <Pressable onPress={redo}>
              <Text style={styles.link}>Redo</Text>
            </Pressable>
            <Pressable onPress={() => setEditAnswer(false)}>
              <Text style={styles.link}>{t('common.done')}</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      <View
        style={[
          styles.photosColumn,
          photoLayout.sideBySide && styles.photosRow,
          photoLayout.sideBySide && { gap: photoLayout.columnGap },
        ]}>
      <View style={photoLayout.sideBySide ? styles.photoCol : undefined}>
        <BundlePhotoBlock
          label={t('item.problemSection')}
          maxWidth={photoLayout.maxWidth}
          maxHeight={photoLayout.maxHeight}
          fillWidth={photoLayout.sideBySide}
          asset={page.asset}
          showInkPreview={Boolean(activeLayer?.strokes.length)}
          showMemoBadge={hasPhotoMemoContent(page.frontMemo)}
          layer={activeLayer ?? undefined}
          memoButtonLabel={t('item.addMemo')}
          onMemoPress={() => openMemoEditor('front')}
          onPress={() => {
            setEditAnswer(false);
            setProblemModalOpen(true);
          }}
        />
      </View>

      <View style={photoLayout.sideBySide ? styles.photoCol : undefined}>
        <BundlePhotoBlock
          label={t('item.answerSection')}
          maxWidth={photoLayout.maxWidth}
          maxHeight={photoLayout.maxHeight}
          fillWidth={photoLayout.sideBySide}
          asset={page.answerAsset}
          showMemoBadge={hasPhotoMemoContent(page.answerMemo)}
          memoButtonLabel={t('item.addMemo')}
          onMemoPress={page.answerAsset ? () => openMemoEditor('back') : undefined}
          onPress={() => {
            if (!page.answerAsset) return;
            setProblemModalOpen(false);
            setAnswerInkKind(null);
            setEditAnswer(true);
          }}
          inkEnabled={editAnswer && Boolean(page.answerAsset)}
          layer={activeLayer ?? undefined}
          tool={tool}
          strokeWidth={strokeWidth}
          onStrokesChange={updateLayerStrokes}
          placeholder={t('item.addBackPhoto')}
          onAddPress={addBackPhoto}
        />
      </View>
      </View>

      <Button
        label={t('dashboard.startReview')}
        variant="secondary"
        onPress={() =>
          router.push({
            pathname: '/review/session',
            params: { bundleId: bundle.id },
          })
        }
        style={{ marginTop: 8 }}
      />
      <Button
        label={t('common.save')}
        onPress={() => showMessage('', t('capture.saved'))}
        style={{ marginTop: 8 }}
      />
      <Button
        label={t('item.archive')}
        variant="secondary"
        onPress={() => {
          if (bundle.archived) {
            unarchiveBundle(bundle.id);
            return;
          }
          setArchivePickerOpen(true);
        }}
        style={{ marginTop: 8 }}
      />
      <Button
        label={t('item.deletePhoto')}
        variant="secondary"
        onPress={confirmDeleteCurrentPage}
        style={{ marginTop: 8 }}
      />
      <Button
        label={t('item.deleteAll')}
        variant="ghost"
        onPress={() => {
          confirmDestructive({
            title: t('item.deletePhotoTitle'),
            message: t('item.deleteAllMessage'),
            cancelLabel: t('common.cancel'),
            confirmLabel: t('item.deleteAll'),
            onConfirm: () => {
              moveBundleToTrash(bundle.id);
              safeRouterBack(router, folderBack);
            },
          });
        }}
      />

      <PhotoMemoEditorModal
        visible={memoOpen}
        sideLabel={
          memoSide === 'front' ? t('item.problemSection') : t('item.answerSection')
        }
        asset={memoSide === 'front' ? page.asset : page.answerAsset!}
        memo={memoSide === 'front' ? frontMemo : answerMemo}
        onMemoChange={(m) => updatePageMemo(memoSide, m)}
        onClose={() => setMemoOpen(false)}
      />

      <ProblemPhotoModal
        visible={problemModalOpen}
        frontAsset={page.asset}
        backAsset={page.answerAsset}
        layer={activeLayer ?? null}
        tool={tool}
        penWidth={penWidth}
        highlighterWidth={highlighterWidth}
        eraserWidth={eraserWidth}
        onToolChange={setTool}
        onPenWidthChange={setPenWidth}
        onHighlighterWidthChange={setHighlighterWidth}
        onEraserWidthChange={setEraserWidth}
        onStrokesChange={updateLayerStrokes}
        onBeforeInkUse={ensureLayer}
        onClose={() => setProblemModalOpen(false)}
        onCropRequest={(side) => openCrop(side)}
      />

      <PhotoCropModal
        visible={cropOpen}
        uri={cropUri}
        sideLabel={cropSide === 'front' ? t('item.problemSection') : t('item.answerSection')}
        onConfirm={onCropDone}
        onClose={() => setCropOpen(false)}
      />

      <ArchiveSubjectPickerModal
        visible={archivePickerOpen}
        subjects={data.subjects}
        currentSubjectId={bundle.subjectId}
        onClose={() => setArchivePickerOpen(false)}
        onConfirm={(subjectId) => {
          setArchivePickerOpen(false);
          if (subjectId !== bundle.subjectId) {
            updateBundle(bundle.id, { subjectId });
          }
          archiveBundle(bundle.id);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleBlock: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.grayLight,
  },
  titleLabel: { fontSize: theme.font.caption, fontWeight: '800', color: theme.gray, marginBottom: 6 },
  titleInput: {
    fontSize: theme.font.heading,
    fontWeight: '800',
    color: theme.black,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.grayLight,
  },
  studyDateLine: {
    marginTop: 8,
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.orange,
  },
  photosColumn: {
    width: '100%',
    marginBottom: 4,
  },
  photosRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  photoCol: {
    flex: 1,
    minWidth: 0,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  pagerSection: {
    position: 'relative',
    marginBottom: 0,
  },
  fullscreenBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: theme.orange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  pager: {},
  pageWrap: { position: 'relative' },
  page: {},
  annotationOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  pageIndicator: { textAlign: 'center', color: theme.gray, marginVertical: 8 },
  pairSection: { marginTop: 8, marginBottom: 12 },
  pairTitle: { fontSize: theme.font.caption, fontWeight: '800', color: theme.gray, marginBottom: 8 },
  linkDisabled: { opacity: 0.5 },
  pairRow: { flexDirection: 'row', gap: 12 },
  pairCol: { flex: 1, gap: 4 },
  pairLabel: { fontSize: 11, fontWeight: '700', color: theme.gray },
  pairThumb: { width: '100%', height: 88, borderRadius: theme.radius.sm, backgroundColor: theme.surface },
  pairAdd: {
    height: 88,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.orange,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.orangeSoft,
  },
  pairAddText: { color: theme.orange, fontWeight: '800', fontSize: 12 },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 12 },
  note: {
    minHeight: 80,
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.grayLight,
    fontSize: theme.font.body,
  },
  ocrBlock: { marginTop: 8, gap: 8 },
  ocrRerun: { alignSelf: 'flex-start' },
  timingBlock: { marginTop: 8, marginBottom: 4 },
  labelSpaced: { marginTop: 14 },
  secRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  secScroll: { marginTop: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  label: { fontWeight: '700', marginRight: 8 },
  sec: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.grayLight,
  },
  secOn: { backgroundColor: theme.orange, borderColor: theme.orange },
  secText: { color: theme.black },
  secOnText: { color: theme.white, fontWeight: '700' },
  link: { color: theme.orange, fontWeight: '700' },
});
