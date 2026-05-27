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

import { AnnotationCanvas } from '@/components/annotation/AnnotationCanvas';
import { InkToolBar } from '@/components/annotation/InkToolBar';
import { Button } from '@/components/ui/Button';
import { PhotoFullscreenModal } from '@/components/ui/PhotoFullscreenModal';
import { ResolvedImage } from '@/components/ui/ResolvedImage';
import { NotFoundView } from '@/components/ui/NotFoundView';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { attachAnswerToPage } from '@/lib/domain/attach-answer';
import { getFullImageUri, getPreviewImageUri } from '@/lib/files/display-image-uri';
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
import { extractOcrFromImageUri, isOcrAvailable } from '@/lib/review/ocr-extract';
import { confirmDestructive, showMessage } from '@/lib/ui/confirm';
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
  const [note, setNote] = useState('');
  const [ocrTextDraft, setOcrTextDraft] = useState('');
  const [answerOcrDraft, setAnswerOcrDraft] = useState('');
  const [ocrBusy, setOcrBusy] = useState(false);
  const ocrEnabled = Platform.OS !== 'web' && isOcrAvailable();
  const [tool, setTool] = useState<InkToolId>('pen-black');
  const [penWidth, setPenWidth] = useState<number>(PEN_WIDTHS[1]);
  const [highlighterWidth, setHighlighterWidth] = useState<number>(HIGHLIGHTER_WIDTHS[1]);
  const [eraserWidth, setEraserWidth] = useState<number>(ERASER_WIDTHS[1]);
  const [photoFullscreen, setPhotoFullscreen] = useState(false);
  const [layersVisible, setLayersVisible] = useState(true);
  const [undoStack, setUndoStack] = useState<NoteLayer['strokes'][]>([]);
  const [redoStack, setRedoStack] = useState<NoteLayer['strokes'][]>([]);
  const viewport = useViewportLayout();
  const pagerSize = viewport.pagerSize;

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
    if (!page) return;
    setNote(page.textNote);
    setOcrTextDraft(page.ocrText);
    setAnswerOcrDraft(page.answerOcrText);
  }, [page?.id]);

  useEffect(() => {
    if (!bundle) return;
    setPageIndex((i) => Math.min(i, Math.max(0, bundle.pages.length - 1)));
  }, [bundle?.id, bundle?.pages.length]);

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

  const saveOcrFields = (ocrText: string, answerOcrText: string) => {
    updateBundle(bundle.id, {
      pages: bundle.pages.map((p) =>
        p.id === page.id ? { ...p, ocrText, answerOcrText, updatedAt: new Date().toISOString() } : p
      ),
    });
  };

  const persistEditsRef = useRef<() => void>(() => {});
  persistEditsRef.current = () => {
    updateBundle(bundle.id, {
      pages: bundle.pages.map((p) =>
        p.id === page.id ? { ...p, textNote: note, updatedAt: new Date().toISOString() } : p
      ),
    });
    saveOcrFields(ocrTextDraft, answerOcrDraft);
  };

  useFocusEffect(
    useCallback(() => {
      return () => persistEditsRef.current();
    }, [bundle.id, page.id])
  );

  const rerunOcr = async () => {
    if (!ocrEnabled) {
      showMessage(t('item.ocrUnavailable'));
      return;
    }
    setOcrBusy(true);
    try {
      const frontUri = getFullImageUri(page.asset);
      const front = frontUri ? await extractOcrFromImageUri(frontUri) : '';
      const ansUri = getAnswerImageUri(page);
      const back = ansUri ? await extractOcrFromImageUri(ansUri) : answerOcrDraft;
      setOcrTextDraft(front);
      setAnswerOcrDraft(back);
      saveOcrFields(front, back);
      if (!front && !back) showMessage(t('item.ocrNoText'));
    } finally {
      setOcrBusy(false);
    }
  };

  const confirmDeleteCurrentPage = () => {
    const isLast = bundle.pages.length <= 1;
    confirmDestructive({
      title: t('item.deletePhotoTitle'),
      message: isLast ? t('item.deleteLastPhotoMessage') : t('item.deletePhotoMessage'),
      cancelLabel: t('common.cancel'),
      confirmLabel: t('item.deletePhoto'),
      onConfirm: () => {
        deletePage(bundle.id, page.id);
        if (isLast) safeRouterBack(router, folderBack);
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
      const { saved, skippedDueToLimit, failed } = await importPhotosToSubject(
        bundle.subjectId,
        picked.files.map((f) => f.uri),
        bundle.studyDate
      );
      if (saved > 0 && skippedDueToLimit > 0) {
        showMessage(
          '',
          t('folder.importPartialLimit', { saved, skipped: skippedDueToLimit })
        );
        router.replace({ pathname: '/folder/[id]', params: { id: bundle.subjectId } });
      } else if (saved > 0) {
        showMessage('', t('folder.importSaved', { count: saved }));
        router.replace({ pathname: '/folder/[id]', params: { id: bundle.subjectId } });
      } else if (skippedDueToLimit > 0) {
        showMessage('', t('folder.importLimitReached'));
      } else if (failed) {
        showMessage('', t('folder.importFailed'));
      }
    } finally {
      setImportingMore(false);
    }
  };

  const backUri = getFullImageUri(page.answerAsset);
  const frontFullUri = getFullImageUri(page.asset);

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

      <View style={styles.pagerSection}>
        <Pressable
          style={styles.fullscreenBtn}
          onPress={() => setPhotoFullscreen(true)}
          hitSlop={8}
          accessibilityLabel={t('item.viewFullscreen')}>
          <SymbolView
            name={{
              ios: 'arrow.up.left.and.arrow.down.right',
              android: 'fullscreen',
              web: 'fullscreen',
            }}
            size={18}
            tintColor={theme.orange}
          />
        </Pressable>
        <ScrollView
          horizontal
          pagingEnabled
          style={[styles.pager, { height: pagerSize }]}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / pagerSize);
            setPageIndex(i);
          }}>
        {bundle.pages.map((p) => (
          <View
            key={p.id}
            style={[styles.pageWrap, { width: pagerSize, height: pagerSize }]}>
            <ResolvedImage
              uri={getPreviewImageUri(p.asset) ?? getFullImageUri(p.asset)}
              style={[styles.page, { width: pagerSize, height: pagerSize }]}
              resizeMode="contain"
            />
            {p.id === page.id && activeLayer && layersVisible && (
              <AnnotationCanvas
                layer={activeLayer}
                tool={tool}
                strokeWidth={strokeWidth}
                visible
                onStrokesChange={updateLayerStrokes}
                height={pagerSize}
                style={styles.annotationOverlay}
              />
            )}
          </View>
        ))}
        </ScrollView>
      </View>
      <Text style={styles.pageIndicator}>
        {pageIndex + 1} / {bundle.pages.length}
      </Text>

      <View style={styles.pairSection}>
        <Text style={styles.pairTitle}>{t('item.flashcardPair')}</Text>
        <View style={styles.pairRow}>
          <View style={styles.pairCol}>
            <Text style={styles.pairLabel}>{t('capture.frontLabel')}</Text>
            <ResolvedImage uri={getPreviewImageUri(page.asset)} style={styles.pairThumb} />
          </View>
          <View style={styles.pairCol}>
            <Text style={styles.pairLabel}>{t('capture.backLabel')}</Text>
            {backUri ? (
              <ResolvedImage uri={backUri} style={styles.pairThumb} />
            ) : (
              <Pressable style={styles.pairAdd} onPress={addBackPhoto}>
                <Text style={styles.pairAddText}>{t('item.addBackPhoto')}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      <Pressable onPress={importMorePhotos} disabled={importingMore} style={styles.addProblemRow}>
        <Text style={[styles.link, importingMore && styles.linkDisabled]}>
          {importingMore ? t('folder.importing') : t('folder.addProblem')}
        </Text>
      </Pressable>

      <InkToolBar
        tool={tool}
        penWidth={penWidth}
        highlighterWidth={highlighterWidth}
        eraserWidth={eraserWidth}
        onBeforeToolChange={ensureLayer}
        onToolChange={setTool}
        onPenWidthChange={setPenWidth}
        onHighlighterWidthChange={setHighlighterWidth}
        onEraserWidthChange={setEraserWidth}
      />
      <View style={styles.toolRow}>
        <Pressable onPress={undo}><Text style={styles.link}>Undo</Text></Pressable>
        <Pressable onPress={redo}><Text style={styles.link}>Redo</Text></Pressable>
        <Text style={styles.label}>{t('item.layers')}</Text>
        <Switch value={layersVisible} onValueChange={setLayersVisible} trackColor={{ true: theme.orange }} />
      </View>

      <TextInput
        style={styles.note}
        multiline
        value={note || page.textNote}
        onChangeText={setNote}
        onBlur={() =>
          updateBundle(bundle.id, {
            pages: bundle.pages.map((p) => (p.id === page.id ? { ...p, textNote: note } : p)),
          })
        }
        placeholder={t('item.note')}
        placeholderTextColor={theme.gray}
      />

      {ocrEnabled ? (
        <View style={styles.ocrBlock}>
          <Pressable onPress={rerunOcr} disabled={ocrBusy} style={styles.ocrRerun}>
            <Text style={[styles.link, ocrBusy && styles.linkDisabled]}>
              {ocrBusy ? t('item.ocrRerunning') : t('item.ocrRerun')}
            </Text>
          </Pressable>
          <TextInput
            style={styles.note}
            multiline
            value={ocrTextDraft}
            onChangeText={setOcrTextDraft}
            onBlur={() => saveOcrFields(ocrTextDraft, answerOcrDraft)}
            placeholder={t('item.ocrText')}
            placeholderTextColor={theme.gray}
          />
          {page.answerAsset ? (
            <TextInput
              style={styles.note}
              multiline
              value={answerOcrDraft}
              onChangeText={setAnswerOcrDraft}
              onBlur={() => saveOcrFields(ocrTextDraft, answerOcrDraft)}
              placeholder={t('item.ocrAnswerText')}
              placeholderTextColor={theme.gray}
            />
          ) : null}
        </View>
      ) : null}

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

      <Pressable onPress={onAddLayer}>
        <Text style={styles.link}>{t('item.addLayer')}</Text>
      </Pressable>

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
            params: { bundleId: bundle.id, blackout: '1' },
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

      <PhotoFullscreenModal
        visible={photoFullscreen}
        frontUri={frontFullUri ?? page.asset.thumbnailUri ?? ''}
        backUri={backUri}
        onClose={() => setPhotoFullscreen(false)}
        layer={activeLayer ?? null}
        onStrokesChange={updateLayerStrokes}
        tool={tool}
        penWidth={penWidth}
        highlighterWidth={highlighterWidth}
        eraserWidth={eraserWidth}
        onToolChange={setTool}
        onPenWidthChange={setPenWidth}
        onHighlighterWidthChange={setHighlighterWidth}
        onEraserWidthChange={setEraserWidth}
        onBeforeInkUse={ensureLayer}
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
