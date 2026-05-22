import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { resetReviewFromToday } from '@/lib/review';
import type { AnnotationLayer } from '@/lib/types';

export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { data, updateItem, moveItemToTrash } = useApp();
  const item = data.items.find((i) => i.id === id);
  const [note, setNote] = useState(item?.textNote ?? '');
  const [slideshow, setSlideshow] = useState(item?.slideshowSeconds ?? 10);

  useEffect(() => {
    if (item) {
      setNote(item.textNote);
      setSlideshow(item.slideshowSeconds);
    }
  }, [item?.id]);

  if (!item) return null;

  const visibleLayers = item.layers.filter((l) => l.visible);
  const toggleLayer = (layerId: string, visible: boolean) => {
    updateItem(item.id, {
      layers: item.layers.map((l) => (l.id === layerId ? { ...l, visible } : l)),
    });
  };

  const addLayerPlaceholder = () => {
    const layer: AnnotationLayer = {
      id: `layer_${Date.now()}`,
      studyDate: new Date().toISOString().slice(0, 10),
      imageUri: item.imageUri,
      note: '',
      visible: true,
      createdAt: new Date().toISOString(),
    };
    Alert.alert(t('item.resetReviewTitle'), '', [
      {
        text: t('item.keepCycle'),
        onPress: () =>
          updateItem(item.id, {
            layers: [...item.layers, layer],
            reviewAnchorDate: item.reviewAnchorDate,
            reviewStepIndex: item.reviewStepIndex,
            lastReviewedAt: item.lastReviewedAt,
          }),
      },
      {
        text: t('item.resetCycle'),
        onPress: () =>
          updateItem(item.id, { ...resetReviewFromToday(item), layers: [...item.layers, layer] }),
      },
    ]);
  };

  const toggleExamTag = () => {
    const tags = item.tags.includes('exam')
      ? item.tags.filter((x) => x !== 'exam')
      : [...item.tags, 'exam'];
    updateItem(item.id, { tags });
  };

  return (
    <Screen scroll>
      <Image source={{ uri: item.imageUri }} style={styles.photo} resizeMode="contain" />
      {visibleLayers.map((layer) => (
        <View key={layer.id} style={styles.layerBar}>
          <Text style={styles.layerDate}>{layer.studyDate}</Text>
          <Switch value={layer.visible} onValueChange={(v) => toggleLayer(layer.id, v)} />
        </View>
      ))}

      <TextInput
        style={styles.noteInput}
        multiline
        placeholder={t('item.note')}
        placeholderTextColor={theme.gray}
        value={note}
        onChangeText={setNote}
        onBlur={() => updateItem(item.id, { textNote: note })}
      />

      <View style={styles.row}>
        <Text style={styles.label}>{t('item.slideshow')}</Text>
        {[5, 10, 30].map((sec) => (
          <Pressable
            key={sec}
            onPress={() => {
              setSlideshow(sec);
              updateItem(item.id, { slideshowSeconds: sec });
            }}
            style={[styles.secBtn, slideshow === sec && styles.secBtnOn]}>
            <Text style={slideshow === sec ? styles.secOnText : styles.secText}>
              {sec === 5 ? t('item.sec5') : sec === 10 ? t('item.sec10') : t('item.sec30')}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable onPress={addLayerPlaceholder} style={styles.linkBtn}>
        <Text style={styles.link}>{t('item.addLayer')}</Text>
      </Pressable>

      <Pressable onPress={toggleExamTag} style={styles.chip}>
        <Text style={styles.chipText}>
          {item.tags.includes('exam') ? '✓ ' : ''}{t('item.tagExam')}
        </Text>
      </Pressable>

      <Button
        label={t('item.slideshow')}
        onPress={() => router.push({ pathname: '/review/session', params: { ids: item.id, slideshow: '1' } })}
        style={{ marginTop: 12 }}
      />

      <Button
        label={item.archived ? t('folder.unarchive') : t('item.archive')}
        variant="secondary"
        onPress={() => updateItem(item.id, { archived: !item.archived })}
        style={{ marginTop: 8 }}
      />

      <Button
        label={t('item.delete')}
        variant="ghost"
        onPress={() => {
          moveItemToTrash(item.id);
          router.back();
        }}
        style={{ marginTop: 8 }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', height: 320, backgroundColor: theme.white, borderRadius: 12 },
  layerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    padding: 10,
    backgroundColor: theme.white,
    borderRadius: 8,
  },
  layerDate: { fontSize: 13, color: theme.gray },
  noteInput: {
    marginTop: 16,
    minHeight: 80,
    backgroundColor: theme.white,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: theme.black,
    borderWidth: 1,
    borderColor: theme.grayLight,
    textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  label: { fontSize: 14, fontWeight: '600', color: theme.black, marginRight: 8 },
  secBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: theme.grayLight },
  secBtnOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  secText: { color: theme.black },
  secOnText: { color: theme.white, fontWeight: '600' },
  linkBtn: { marginTop: 12 },
  link: { color: theme.accent, fontWeight: '600' },
  chip: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: theme.accentMuted,
  },
  chipText: { color: theme.accent, fontWeight: '600' },
});
