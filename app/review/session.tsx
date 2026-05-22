import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { advanceAfterReview } from '@/lib/review';

export default function ReviewSessionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ ids?: string; slideshow?: string }>();
  const { dueToday, data, updateItem } = useApp();

  const items = useMemo(() => {
    if (params.ids) {
      const idList = params.ids.split(',');
      return data.items.filter((i) => idList.includes(i.id));
    }
    return dueToday;
  }, [params.ids, dueToday, data.items]);

  const [index, setIndex] = useState(0);
  const current = items[index];
  const autoAdvance = params.slideshow === '1' && current;

  useEffect(() => {
    if (!autoAdvance || !current) return;
    const timer = setTimeout(() => {
      if (index < items.length - 1) setIndex((i) => i + 1);
    }, (current.slideshowSeconds ?? 10) * 1000);
    return () => clearTimeout(timer);
  }, [index, autoAdvance, current?.slideshowSeconds, items.length]);

  if (!current) {
    router.back();
    return null;
  }

  const complete = () => {
    updateItem(current.id, advanceAfterReview(current));
    if (index < items.length - 1) {
      setIndex((i) => i + 1);
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.root}>
      <Image source={{ uri: current.imageUri }} style={styles.image} resizeMode="contain" />
      {current.textNote ? <Text style={styles.note}>{current.textNote}</Text> : null}
      <View style={styles.footer}>
        <Text style={styles.progress}>
          {index + 1} / {items.length}
        </Text>
        <Button label={t('review.complete')} onPress={complete} />
        {index < items.length - 1 && (
          <Pressable onPress={() => setIndex((i) => i + 1)} style={styles.skip}>
            <Text style={styles.skipText}>{t('review.next')}</Text>
          </Pressable>
        )}
      </View>
      <Pressable style={styles.close} onPress={() => router.back()}>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.black },
  image: { flex: 1, width: '100%' },
  note: {
    color: theme.white,
    padding: 16,
    fontSize: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  footer: { padding: 20, backgroundColor: theme.beige, gap: 8 },
  progress: { textAlign: 'center', color: theme.gray, marginBottom: 4 },
  skip: { alignItems: 'center', padding: 8 },
  skipText: { color: theme.accent, fontWeight: '600' },
  close: { position: 'absolute', top: 48, right: 20 },
  closeText: { color: theme.white, fontSize: 24 },
});
