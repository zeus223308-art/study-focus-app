import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AnnotationCanvas } from '@/components/annotation/AnnotationCanvas';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { PEN_TOOLS, HIGHLIGHTER_TOOLS } from '@/lib/domain/defaults';
import type { InkToolId, NoteLayer } from '@/lib/domain/types';

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
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { data, updateBundle, archiveBundle, moveBundleToTrash, applyLayerCycleChoice } = useApp();
  const bundle = data.bundles.find((b) => b.id === id);
  const [pageIndex, setPageIndex] = useState(0);
  const [note, setNote] = useState('');
  const [tool, setTool] = useState<InkToolId>('pen-black');
  const [layersVisible, setLayersVisible] = useState(true);
  const [undoStack, setUndoStack] = useState<NoteLayer['strokes'][]>([]);
  const [redoStack, setRedoStack] = useState<NoteLayer['strokes'][]>([]);

  const page = bundle?.pages[pageIndex] ?? bundle?.pages[0];
  const activeLayer = useMemo(
    () => page?.layers[page.layers.length - 1],
    [page?.layers]
  );

  if (!bundle || !page) return null;

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

  return (
    <Screen scroll>
      <ScrollView horizontal pagingEnabled style={styles.pager}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / 360);
          setPageIndex(i);
        }}>
        {bundle.pages.map((p) => (
          <View key={p.id} style={styles.pageWrap}>
            <Image source={{ uri: p.asset.thumbnailUri }} style={styles.page} resizeMode="contain" />
            {activeLayer && layersVisible && (
              <AnnotationCanvas
                layer={activeLayer}
                tool={tool}
                visible
                onStrokesChange={updateLayerStrokes}
                height={200}
              />
            )}
          </View>
        ))}
      </ScrollView>
      <Text style={styles.pageIndicator}>
        {pageIndex + 1} / {bundle.pages.length}
      </Text>

      <View style={styles.tools}>
        {[...PEN_TOOLS, ...HIGHLIGHTER_TOOLS, { id: 'eraser' as const, label: 'Eraser' }].map((t) => (
          <Pressable
            key={t.id}
            onPress={() => {
              ensureLayer();
              setTool(t.id as InkToolId);
            }}
            style={[styles.toolChip, tool === t.id && styles.toolChipOn]}>
            <Text style={tool === t.id ? styles.toolOn : styles.toolText}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
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

      <View style={styles.row}>
        <Text style={styles.label}>{t('item.slideshow')}</Text>
        {[5, 10, 30].map((sec) => (
          <Pressable
            key={sec}
            onPress={() =>
              updateBundle(bundle.id, {
                pages: bundle.pages.map((p) => ({ ...p, slideshowSeconds: sec })),
              })
            }
            style={[styles.sec, page.slideshowSeconds === sec && styles.secOn]}>
            <Text style={page.slideshowSeconds === sec ? styles.secOnText : styles.secText}>{sec}s</Text>
          </Pressable>
        ))}
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
        label={t('item.delete')}
        variant="ghost"
        onPress={() => {
          moveBundleToTrash(bundle.id);
          router.back();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pager: { height: 360 },
  pageWrap: { width: 360, height: 360, position: 'relative' },
  page: { width: 360, height: 360 },
  pageIndicator: { textAlign: 'center', color: theme.gray, marginVertical: 8 },
  tools: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  toolChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.grayLight,
  },
  toolChipOn: { backgroundColor: theme.orange, borderColor: theme.orange },
  toolText: { fontSize: 12, color: theme.black },
  toolOn: { fontSize: 12, color: theme.white, fontWeight: '700' },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 12 },
  note: {
    minHeight: 80,
    backgroundColor: theme.white,
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.grayLight,
    fontSize: theme.font.body,
  },
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
