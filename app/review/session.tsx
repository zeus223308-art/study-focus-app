import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import type { NoteBundle, NotePage } from '@/lib/domain/types';
import { BLACKOUT_COUNTDOWN } from '@/lib/review/blackout';
import { OCR_PASS_THRESHOLD, scoreRecallAgainstAnswer } from '@/lib/review/ocr-score';

type Slide = { bundle: NoteBundle; page: NotePage };

export default function ReviewSessionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ bundleId?: string; slideshow?: string; blackout?: string }>();
  const { dueToday, dueSelected, data, completeReview, storage, updateBundle } = useApp();

  const slides = useMemo<Slide[]>(() => {
    const bundles = params.bundleId
      ? data.bundles.filter((b) => b.id === params.bundleId)
      : dueSelected.length
        ? dueSelected
        : dueToday;
    const list: Slide[] = [];
    for (const bundle of bundles) {
      for (const page of bundle.pages) {
        list.push({ bundle, page });
      }
    }
    return list;
  }, [params.bundleId, dueSelected, dueToday, data.bundles]);

  const [index, setIndex] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [blackedOut, setBlackedOut] = useState(false);
  const [scratch, setScratch] = useState('');
  const [adVisible, setAdVisible] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const fade = useMemo(() => new Animated.Value(1), []);

  const current = slides[index];
  const auto = params.slideshow === '1';
  const useBlackout = params.blackout !== '0';

  useEffect(() => {
    if (!auto || !current) return;
    const timer = setTimeout(() => advance(), (current.page.slideshowSeconds ?? 10) * 1000);
    return () => clearTimeout(timer);
  }, [index, auto, current]);

  useEffect(() => {
    if (!current?.page.asset.remotePath || current.page.asset.originalLocalUri) return;
    if (current.page.asset.syncStatus === 'fetch_required' || current.page.asset.syncStatus === 'synced') {
      storage.fetchMasterAsset(
        current.page.asset.remotePath!,
        current.page.asset.originalLocalUri ?? current.page.asset.localMiniUri
      );
    }
  }, [current?.page.id]);

  useEffect(() => {
    if (!useBlackout || !current) return;
    setBlackedOut(false);
    setScratch('');
    setCountdown(BLACKOUT_COUNTDOWN[0]);
    let step = 0;
    const tick = setInterval(() => {
      step += 1;
      if (step < BLACKOUT_COUNTDOWN.length) {
        setCountdown(BLACKOUT_COUNTDOWN[step]);
      } else {
        setCountdown(null);
        setBlackedOut(true);
        Animated.timing(fade, { toValue: 0.15, duration: 400, useNativeDriver: true }).start();
        clearInterval(tick);
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [index, useBlackout, current?.page.id]);

  const advance = useCallback(() => {
    if (index < slides.length - 1) {
      setIndex((i) => i + 1);
      fade.setValue(1);
    } else {
      router.back();
    }
  }, [index, slides.length, router, fade]);

  const submitRecall = () => {
    if (!current) return;
    const answerText =
      current.page.answerAsset?.thumbnailUri ??
      current.page.textNote ??
      current.page.ocrText;
    const score = scoreRecallAgainstAnswer(scratch, answerText);
    updateBundle(current.bundle.id, {
      review: { ...current.bundle.review, aiScoreLast: score },
    });
    if (score >= OCR_PASS_THRESHOLD) {
      completeReview(current.bundle.id);
      advance();
    } else {
      setAdVisible(true);
      setTimeout(() => {
        setAdVisible(false);
      }, 5000);
    }
  };

  if (!current) {
    router.back();
    return null;
  }

  const uri = current.page.asset.originalLocalUri ?? current.page.asset.thumbnailUri;
  const isPro = data.settings.tier === 'pro';

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.imageWrap, { opacity: blackedOut ? fade : 1 }]}>
        <Image source={{ uri }} style={styles.image} resizeMode="contain" />
      </Animated.View>

      {countdown !== null && (
        <View style={styles.countdown}>
          <Text style={styles.countdownText}>{countdown}</Text>
        </View>
      )}

      {blackedOut && (
        <View style={styles.scratch}>
          <TextInput
            style={styles.scratchInput}
            multiline
            placeholder={t('review.recallPlaceholder')}
            placeholderTextColor={theme.grayMuted}
            value={scratch}
            onChangeText={setScratch}
          />
          <Button label={t('review.submitRecall')} onPress={submitRecall} />
          {!isPro && (
            <Pressable onPress={() => setHintVisible(true)}>
              <Text style={styles.hint}>{t('review.hintAd')}</Text>
            </Pressable>
          )}
        </View>
      )}

      {!blackedOut && (
        <View style={styles.footer}>
          <Text style={styles.progress}>
            {index + 1} / {slides.length}
          </Text>
          <Button
            label={t('review.complete')}
            onPress={() => {
              completeReview(current.bundle.id);
              advance();
            }}
          />
        </View>
      )}

      <Pressable style={styles.close} onPress={() => router.back()}>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>

      <Modal visible={adVisible} transparent animationType="fade">
        <View style={styles.ad}>
          <Text style={styles.adTitle}>{t('review.adTitle')}</Text>
          <Text style={styles.adSub}>{t('review.adWait')}</Text>
        </View>
      </Modal>

      <Modal visible={hintVisible} transparent animationType="fade">
        <View style={styles.ad}>
          <Text style={styles.adTitle}>{t('review.hintTitle')}</Text>
          <Pressable
            onPress={() => {
              setHintVisible(false);
              Animated.timing(fade, { toValue: 0.6, duration: 200, useNativeDriver: true }).start();
              setTimeout(() => Animated.timing(fade, { toValue: 0.15, duration: 300, useNativeDriver: true }).start(), 8000);
            }}>
            <Text style={styles.hintBtn}>{t('review.watchAd')}</Text>
          </Pressable>
          <Pressable onPress={() => setHintVisible(false)}>
            <Text style={styles.cancel}>{t('common.cancel')}</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.blackPure },
  imageWrap: { flex: 1 },
  image: { flex: 1, width: '100%' },
  countdown: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  countdownText: { fontSize: 96, fontWeight: '200', color: theme.white },
  scratch: { padding: 20, backgroundColor: theme.beige, gap: 12 },
  scratchInput: {
    minHeight: 100,
    backgroundColor: theme.white,
    borderRadius: theme.radius.md,
    padding: 14,
    fontSize: theme.font.body,
    borderWidth: 1,
    borderColor: theme.grayLight,
  },
  hint: { color: theme.orange, fontWeight: '700', textAlign: 'center' },
  footer: { padding: 20, backgroundColor: theme.beige, gap: 8 },
  progress: { textAlign: 'center', color: theme.gray },
  close: { position: 'absolute', top: 48, right: 20 },
  closeText: { color: theme.white, fontSize: 24 },
  ad: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  adTitle: { color: theme.white, fontSize: 22, fontWeight: '800' },
  adSub: { color: theme.grayMuted, marginTop: 12 },
  hintBtn: { color: theme.orange, fontWeight: '800', marginTop: 24, fontSize: 18 },
  cancel: { color: theme.white, marginTop: 16 },
});
