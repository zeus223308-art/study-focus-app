import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { FullscreenInkControls } from '@/components/annotation/FullscreenInkControls';
import { useFullscreenInkFlow } from '@/components/annotation/use-fullscreen-ink-flow';
import { BundlePhotoBlock } from '@/components/bundle/BundlePhotoBlock';
import { PhotoCropModal } from '@/components/bundle/PhotoCropModal';
import { PhotoInkToolbar, type PhotoInkToolKind } from '@/components/bundle/PhotoInkToolbar';
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
import { pickForImport } from '@/lib/import/pick-for-import';
import {
  ERASER_WIDTHS,
  HIGHLIGHTER_WIDTHS,
  PEN_WIDTHS,
  isHighlighterTool,
} from '@/lib/domain/ink-sizes';
import {
  ANSWER_SLIDESHOW_SECONDS,
  formatAnswerSlideshowLabel,
  FRONT_SLIDESHOW_SECONDS,
} from '@/lib/domain/slideshow-timing';
import type { InkToolId, NoteLayer } from '@/lib/domain/types';
import { safeRouterBack } from '@/lib/navigation/safe-back';
import { getAnswerImageUri } from '@/lib/review/answer-text';
import { confirmDestructive, showMessage } from '@/lib/ui/confirm';
import { reportImportPhotosResult } from '@/lib/ui/import-result-feedback';
import { useFullscreenViewerLayout } from '@/lib/ui/fullscreen-viewer-layout';
import { useViewportLayout } from '@/lib/ui/viewport-layout';

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
    moveBundleToTrash,
    deletePage,
    applyLayerCycleChoice,
    importPhotosToSubject,
  } = useApp();
  const bundle = data.bundles.find((b) => b.id === id);
  const initialPageIndex = useMemo(() => {
    if (!bundle || !pageId) return 0;
    const i = bundle.pages.findIndex((p) => p.id === pageId);
    return i >= 0 ? i : 0;
  }, [bundle?.id, pageId]);
  const [pageIndex, setPageIndex] = useState(initialPageIndex);
  const [importingMore, setImportingMore] = useState(false);
  const [tool, setTool] = useState<InkToolId>('pen-black');
  const [penWidth, setPenWidth] = useState<number>(PEN_WIDTHS[1]);
  const [highlighterWidth, setHighlighterWidth] = useState<number>(HIGHLIGHTER_WIDTHS[1]);
  const [eraserWidth, setEraserWidth] = useState<number>(ERASER_WIDTHS[1]);
  const [problemModalOpen, setProblemModalOpen] = useState(false);
  const [editAnswer, setEditAnswer] = useState(false);
  const [answerInkKind, setAnswerInkKind] = useState<PhotoInkToolKind>('pen');
  const [cropOpen, setCropOpen] = useState(false);
  const [cropUri, setCropUri] = useState('');
  const [cropSide, setCropSide] = useState<'front' | 'back'>('front');
  const [undoStack, setUndoStack] = useState<NoteLayer['strokes'][]>([]);
  const [redoStack, setRedoStack] = useState<NoteLayer['strokes'][]>([]);
  const viewport = useViewportLayout();
  const viewerLayout = useFullscreenViewerLayout();
  const photoW = Math.min(viewport.contentMaxWidth - viewport.horizontalPadding * 2, 480);
  const photoH = Math.round(photoW * 1.12);

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

  const importMorePhotos = async () => {
    if (importingMore) return;
    const picked = await pickForImport({
      title: t('folder.importSourceTitle'),
      album: t('folder.importAlbum'),
      files: t('folder.importFiles'),
      cancel: t('common.cancel'),
      unsupportedOnly: t('folder.importUnsupportedOnly'),
      unsupportedSkipped: t('folder.importUnsupportedSkipped'),
    });
    if (!picked.ok) return;

    setImportingMore(true);
    try {
      const result = await importPhotosToSubject(
        bundle.subjectId,
        picked.files.map((f) => f.uri),
        bundle.studyDate
      );
      if (result.saved > 0) {
        router.replace({ pathname: '/folder/[id]', params: { id: bundle.subjectId } });
      } else {
        reportImportPhotosResult(result, t);
      }
    } finally {
      setImportingMore(false);
    }
  };

  const subject = data.subjects.find((s) => s.id === bundle.subjectId);

  return (
    <Screen scroll>
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
          <PhotoInkToolbar
            activeKind={answerInkKind}
            tool={tool}
            onSelectKind={onSelectAnswerInk}
          />
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

      <BundlePhotoBlock
        label={t('item.problemSection')}
        asset={page.asset}
        width={photoW}
        height={photoH}
        onPress={() => {
          setEditAnswer(false);
          setProblemModalOpen(true);
        }}
      />

      <BundlePhotoBlock
        label={t('item.answerSection')}
        asset={page.answerAsset}
        width={photoW}
        height={photoH}
        onPress={() => {
          if (!page.answerAsset) return;
          setProblemModalOpen(false);
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

      <Pressable onPress={importMorePhotos} disabled={importingMore} style={styles.addProblemRow}>
        <Text style={[styles.link, importingMore && styles.linkDisabled]}>
          {importingMore ? t('folder.importing') : t('folder.importPhotos')}
        </Text>
      </Pressable>

      <View style={styles.timingBlock}>
        <Text style={styles.label}>{t('item.slideshowFront')}</Text>
        <View style={styles.secRow}>
          {FRONT_SLIDESHOW_SECONDS.map((sec) => (
            <Pressable
              key={`front-${sec}`}
              onPress={() =>
                updateBundle(bundle.id, {
                  pages: bundle.pages.map((p) => ({ ...p, slideshowSeconds: sec })),
                })
              }
              style={[styles.sec, page.slideshowSeconds === sec && styles.secOn]}>
              <Text style={page.slideshowSeconds === sec ? styles.secOnText : styles.secText}>
                {sec}s
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.label, styles.labelSpaced]}>{t('item.slideshowBack')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.secScroll}>
          <View style={styles.secRow}>
            {ANSWER_SLIDESHOW_SECONDS.map((sec) => (
              <Pressable
                key={`back-${sec}`}
                onPress={() =>
                  updateBundle(bundle.id, {
                    pages: bundle.pages.map((p) => ({ ...p, answerSlideshowSeconds: sec })),
                  })
                }
                style={[
                  styles.sec,
                  (page.answerSlideshowSeconds ?? page.slideshowSeconds) === sec && styles.secOn,
                ]}>
                <Text
                  style={
                    (page.answerSlideshowSeconds ?? page.slideshowSeconds) === sec
                      ? styles.secOnText
                      : styles.secText
                  }>
                  {formatAnswerSlideshowLabel(sec)}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      <Button
        label={t('item.slideshow')}
        onPress={() =>
          router.push({
            pathname: '/review/session',
            params: { bundleId: bundle.id, slideshow: '1' },
          })
        }
      />
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
        label={bundle.archived ? t('folder.unarchive') : t('item.archive')}
        variant="secondary"
        onPress={() => archiveBundle(bundle.id)}
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
  addProblemRow: { marginTop: 4, marginBottom: 12, alignSelf: 'flex-start' },
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
