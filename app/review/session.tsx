import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RecallWorkCard, type ScratchTextBox } from '@/components/review/RecallWorkCard';
import { ScheduleAdvanceSheet } from '@/components/review/ScheduleAdvanceSheet';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { safeRouterBack } from '@/lib/navigation/safe-back';
import { useViewportLayout } from '@/lib/ui/viewport-layout';
import { useApp } from '@/context/AppContext';
import type { InkStroke, NoteBundle, NotePage } from '@/lib/domain/types';
import {
  buildCountdownSteps,
  RECALL_COUNTDOWN_OPTIONS,
} from '@/lib/review/blackout';
import { getFullImageUri } from '@/lib/files/display-image-uri';
import { resolveImageUri } from '@/lib/files/resolve-image-uri';
import { getAnswerImageUri, OCR_PASS_THRESHOLD, scoreActiveRecall } from '@/lib/review/answer-text';
import { isProblemGradable } from '@/lib/review/problem-gradable';
import {
  ANSWER_SLIDESHOW_SECONDS,
  FRONT_SLIDESHOW_SECONDS,
  formatAnswerSlideshowLabel,
  slideshowMsForSide,
} from '@/lib/domain/slideshow-timing';
import { advanceAfterReview, getNextReviewDate } from '@/lib/spacing/engine';

const HINT_PEEK_MS = 8000;
const AD_LOCK_MS = 5000;
type SlideSide = 'front' | 'back';
type Slide = { bundle: NoteBundle; page: NotePage; side: SlideSide };
type Phase = 'front' | 'countdown' | 'recall-work' | 'peek' | 'pass' | 'fail';

export default function ReviewSessionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    bundleId?: string;
    subjectId?: string;
    subjectIds?: string;
    slideshow?: string;
    blackout?: string;
  }>();
  const { dueToday, dueSelected, data, completeReview, storage, updateBundle, getSchedule } =
    useApp();

  const slides = useMemo<Slide[]>(() => {
    const pickedSubjectIds =
      params.subjectIds?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];

    let bundles = params.bundleId
      ? data.bundles.filter((b) => b.id === params.bundleId)
      : pickedSubjectIds.length > 0
        ? data.bundles.filter((b) => !b.archived && pickedSubjectIds.includes(b.subjectId))
        : dueSelected.length
          ? dueSelected
          : dueToday;
    if (params.subjectId) {
      bundles = bundles.filter((b) => b.subjectId === params.subjectId);
    }
    const isSlideshow = params.slideshow === '1';
    const list: Slide[] = [];
    for (const bundle of bundles) {
      for (const page of bundle.pages) {
        list.push({ bundle, page, side: 'front' });
        if (isSlideshow && getAnswerImageUri(page)) {
          list.push({ bundle, page, side: 'back' });
        }
      }
    }
    return list;
  }, [
    params.bundleId,
    params.subjectId,
    params.subjectIds,
    params.slideshow,
    dueSelected,
    dueToday,
    data.bundles,
  ]);

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('front');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recallStrokes, setRecallStrokes] = useState<InkStroke[]>([]);
  const [textBoxes, setTextBoxes] = useState<ScratchTextBox[]>([]);
  const [adLocked, setAdLocked] = useState(false);
  const [adVisible, setAdVisible] = useState(false);
  const [hintOffer, setHintOffer] = useState(false);
  const [premiumReveal, setPremiumReveal] = useState(false);
  const [scheduleSheetVisible, setScheduleSheetVisible] = useState(false);
  const [lastPassScore, setLastPassScore] = useState(0);
  const [passAnim] = useState(() => new Animated.Value(0));
  const passScale = useRef(new Animated.Value(0.7)).current;
  const frontFade = useRef(new Animated.Value(1)).current;
  const problemShift = useRef(new Animated.Value(0)).current;
  const viewport = useViewportLayout();
  const workCardW = Math.min(viewport.width - 24, viewport.contentMaxWidth, 520);
  const problemCardH = Math.round(workCardW * 0.46);
  const workCardH = Math.round(workCardW * 2.0);
  const [recallScrollLocked, setRecallScrollLocked] = useState(false);
  const [resolvedFrontUri, setResolvedFrontUri] = useState<string | null>(null);
  const [resolvedAnswerUri, setResolvedAnswerUri] = useState<string | null>(null);
  const [recallCountdownSec, setRecallCountdownSec] = useState(3);
  const [sessionSlideSec, setSessionSlideSec] = useState<number | null>(null);
  const [slideRemainingSec, setSlideRemainingSec] = useState(0);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const adTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (adTimerRef.current) clearTimeout(adTimerRef.current);
    };
  }, []);

  const current = slides[index];
  const frontUri = getFullImageUri(current?.page.asset);
  const answerUri = current ? getAnswerImageUri(current.page) : null;

  useEffect(() => {
    let cancelled = false;
    if (!frontUri) {
      setResolvedFrontUri(null);
      return;
    }
    resolveImageUri(frontUri).then((u) => {
      if (!cancelled) setResolvedFrontUri(u);
    });
    return () => {
      cancelled = true;
    };
  }, [frontUri, current?.page.id, current?.side]);

  useEffect(() => {
    let cancelled = false;
    if (!answerUri) {
      setResolvedAnswerUri(null);
      return;
    }
    resolveImageUri(answerUri).then((u) => {
      if (!cancelled) setResolvedAnswerUri(u);
    });
    return () => {
      cancelled = true;
    };
  }, [answerUri, current?.page.id]);
  const auto = params.slideshow === '1';
  const isPro = data.settings.tier === 'pro';

  const resetSlide = useCallback(() => {
    setPhase('front');
    setCountdown(null);
    setRecallStrokes([]);
    setTextBoxes([]);
    problemShift.setValue(0);
    setAdLocked(false);
    setAdVisible(false);
    setHintOffer(false);
    setPremiumReveal(false);
    setScheduleSheetVisible(false);
    setLastPassScore(0);
    frontFade.setValue(1);
    passAnim.setValue(0);
    passScale.setValue(0.7);
  }, [frontFade, passAnim, passScale]);

  useEffect(() => {
    resetSlide();
  }, [index, resetSlide]);

  useEffect(() => {
    if (phase !== 'recall-work' && phase !== 'countdown') {
      setRecallScrollLocked(false);
    }
  }, [phase]);

  const effectiveSlideMs = useCallback(
    (page: NotePage, side: SlideSide) => {
      if (sessionSlideSec != null) return sessionSlideSec * 1000;
      return slideshowMsForSide(page, side);
    },
    [sessionSlideSec]
  );

  useEffect(() => {
    if (!current) return;
    const front = current.page.asset;
    if (
      front.remotePath &&
      !front.originalLocalUri &&
      (front.syncStatus === 'fetch_required' || front.syncStatus === 'synced')
    ) {
      storage.fetchMasterAsset(front.remotePath, front.originalLocalUri ?? front.localMiniUri);
    }
    const back = current.page.answerAsset;
    if (
      back?.remotePath &&
      !back.originalLocalUri &&
      (back.syncStatus === 'fetch_required' || back.syncStatus === 'synced')
    ) {
      storage.fetchMasterAsset(back.remotePath, back.originalLocalUri ?? back.localMiniUri);
    }
  }, [current?.page.id, current?.side]);

  const enterRecallPhase = () => {
    setPhase('recall-work');
    problemShift.setValue(0);
  };

  const startCountdown = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    const steps = buildCountdownSteps(recallCountdownSec);
    setPhase('countdown');
    let step = 0;
    setCountdown(steps[0]);
    countdownTimerRef.current = setInterval(() => {
      step += 1;
      if (step < steps.length) {
        setCountdown(steps[step]);
      } else {
        setCountdown(null);
        enterRecallPhase();
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    }, 1000);
  };

  const dismissFailAd = () => {
    if (adTimerRef.current) clearTimeout(adTimerRef.current);
    adTimerRef.current = null;
    setAdVisible(false);
    setAdLocked(false);
    enterRecallPhase();
  };

  const advance = useCallback(() => {
    if (index < slides.length - 1) {
      setIndex((i) => i + 1);
    }
  }, [index, slides.length]);

  const finishSession = useCallback(() => {
    if (params.bundleId) {
      router.replace({
        pathname: '/bundle/[id]',
        params: { id: params.bundleId },
      });
      return;
    }
    safeRouterBack(router, '/(tabs)');
  }, [params.bundleId, router]);

  useEffect(() => {
    if (!auto || !current || phase !== 'front') {
      setSlideRemainingSec(0);
      return;
    }
    const ms = effectiveSlideMs(current.page, current.side);
    const totalSec = Math.max(1, Math.ceil(ms / 1000));
    setSlideRemainingSec(totalSec);
    const started = Date.now();
    const tick = setInterval(() => {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      setSlideRemainingSec(Math.max(0, totalSec - elapsed));
    }, 200);
    const timer = setTimeout(() => {
      if (index < slides.length - 1) {
        setIndex((i) => i + 1);
      }
    }, ms);
    return () => {
      clearTimeout(timer);
      clearInterval(tick);
    };
  }, [index, auto, current, phase, effectiveSlideMs, slides.length]);

  const nextReviewDateLabel = useMemo(() => {
    if (!current) return null;
    const schedule = getSchedule(current.bundle.review.reviewScheduleId);
    if (!schedule) return null;
    const advanced = advanceAfterReview(current.bundle);
    return format(getNextReviewDate(advanced, schedule), 'yyyy-MM-dd');
  }, [current, getSchedule]);

  const finishAfterScheduleChoice = useCallback(() => {
    setScheduleSheetVisible(false);
    passAnim.setValue(0);
    passScale.setValue(0.7);
    setPhase('front');
    advance();
  }, [advance, passAnim, passScale]);

  const showPassCelebration = (score: number) => {
    setLastPassScore(score);
    setPhase('pass');
    passAnim.setValue(0);
    passScale.setValue(0.7);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(passAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.spring(passScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      ]),
      Animated.delay(650),
    ]).start(() => {
      setScheduleSheetVisible(true);
    });
  };

  const onScheduleYes = () => {
    if (!current) return;
    completeReview(current.bundle.id);
    finishAfterScheduleChoice();
  };

  const onScheduleNo = () => {
    finishAfterScheduleChoice();
  };

  const submitRecall = () => {
    if (!current || adLocked) return;
    const gradable = isProblemGradable(current.page);

    if (!gradable) {
      updateBundle(current.bundle.id, {
        review: { ...current.bundle.review, aiScoreLast: null },
      });
      showPassCelebration(100);
      return;
    }

    const score = scoreActiveRecall(recallStrokes, current.page);
    updateBundle(current.bundle.id, {
      review: { ...current.bundle.review, aiScoreLast: score },
    });
    if (score >= OCR_PASS_THRESHOLD) {
      showPassCelebration(score);
    } else {
      setPhase('fail');
      setAdLocked(true);
      setAdVisible(true);
      if (adTimerRef.current) clearTimeout(adTimerRef.current);
      adTimerRef.current = setTimeout(() => {
        dismissFailAd();
      }, AD_LOCK_MS);
    }
  };

  const watchHintAd = () => {
    setHintOffer(false);
    setAdVisible(true);
    const peekMs = current?.page.answerAsset ? HINT_PEEK_MS : 5000;
    setTimeout(() => {
      setAdVisible(false);
      setPhase('peek');
      setTimeout(() => {
        enterRecallPhase();
      }, peekMs);
    }, 2000);
  };

  if (slides.length === 0) {
    return (
      <Screen style={styles.emptyRoot}>
        <Text style={styles.emptyTitle}>{t('review.emptySession')}</Text>
        <Button label={t('common.back')} onPress={finishSession} />
      </Screen>
    );
  }

  if (!current) {
    return (
      <Screen style={styles.emptyRoot}>
        <Text style={styles.emptyTitle}>{t('review.emptySession')}</Text>
        <Button label={t('common.back')} onPress={finishSession} />
      </Screen>
    );
  }

  const showAnswerOverlay = isPro && premiumReveal && answerUri && !auto;
  const hasAnswer = Boolean(answerUri);
  const gradable = isProblemGradable(current.page);
  const recallMode =
    (phase === 'recall-work' || phase === 'countdown') && !showAnswerOverlay;
  const problemLiftY = problemShift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0],
  });
  const showingBack = current.side === 'back' && Boolean(answerUri);
  const displayUri = showingBack ? resolvedAnswerUri : resolvedFrontUri;
  const sideBadge = showingBack ? t('capture.backLabel') : t('review.frontLabel');
  const timerDisplaySec =
    phase === 'countdown' ? null : auto && phase === 'front' ? slideRemainingSec : null;
  const slideSecOptions =
    current.side === 'back' ? ANSWER_SLIDESHOW_SECONDS : FRONT_SLIDESHOW_SECONDS;

  return (
    <View style={[styles.root, recallMode && styles.rootRecall]}>
      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + 8 },
          recallMode && styles.topBarRecall,
        ]}>
        <View style={styles.topBarLeft}>
          {!auto ? (
            isPro ? (
              <View style={styles.premiumToggle}>
                <Text style={[styles.premiumLabel, recallMode && styles.topBarDarkText]}>
                  {t('review.answerToggle')}
                </Text>
                <Switch
                  value={premiumReveal}
                  onValueChange={setPremiumReveal}
                  trackColor={{ false: theme.grayLight, true: theme.orange }}
                  thumbColor={theme.white}
                />
              </View>
            ) : (
              <View style={styles.premiumLocked}>
                <Text style={[styles.premiumLockedText, recallMode && styles.topBarDarkMuted]}>
                  {t('review.answerPremium')}
                </Text>
              </View>
            )
          ) : (
            <Text style={[styles.slideshowProgress, recallMode && styles.topBarDarkText]}>
              {index + 1} / {slides.length}
            </Text>
          )}
        </View>
        <View style={styles.topBarRight}>
          {timerDisplaySec !== null && timerDisplaySec > 0 ? (
            <View style={[styles.timerBadge, recallMode && styles.timerBadgeRecall]}>
              <Text style={[styles.timerBadgeText, recallMode && styles.topBarDarkText]}>
                {timerDisplaySec}
              </Text>
            </View>
          ) : null}
          <Pressable
            style={styles.close}
            onPress={finishSession}
            hitSlop={12}>
            <Text style={[styles.closeText, recallMode && styles.topBarDarkText]}>{t('common.close')}</Text>
          </Pressable>
        </View>
      </View>

      {recallMode ? (
        <ScrollView
          style={styles.recallScroll}
          contentContainerStyle={[styles.recallFull, { paddingTop: 8, paddingBottom: 32 }]}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!recallScrollLocked}
          showsVerticalScrollIndicator
          nestedScrollEnabled>
          <Animated.View
            style={[
              styles.problemStage,
              { width: workCardW, height: problemCardH, transform: [{ translateY: problemLiftY }] },
            ]}>
            {resolvedFrontUri ? (
              <Image
                source={{ uri: resolvedFrontUri }}
                style={{ width: workCardW, height: problemCardH }}
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.imageMissing, { width: workCardW, height: problemCardH }]} />
            )}
            {phase === 'countdown' && countdown !== null ? (
              <View style={styles.countdownOnImage}>
                <Text style={styles.countdownOnImageText}>{countdown}</Text>
              </View>
            ) : null}
          </Animated.View>

          {phase === 'recall-work' ? (
            <>
              <RecallWorkCard
                width={workCardW}
                height={workCardH}
                strokes={recallStrokes}
                onStrokesChange={setRecallStrokes}
                textBoxes={textBoxes}
                onTextBoxesChange={setTextBoxes}
                onCanvasTouchChange={setRecallScrollLocked}
              />
              {!hasAnswer ? <Text style={styles.warn}>{t('review.noBackPhoto')}</Text> : null}
              <View style={styles.recallActions}>
                <Button label={t('review.submitRecall')} onPress={submitRecall} disabled={adLocked} />
                {!isPro && gradable ? (
                  <Pressable onPress={() => setHintOffer(true)} disabled={!hasAnswer}>
                    <Text style={[styles.hintLink, !hasAnswer && styles.hintDisabled]}>
                      {t('review.hintAd')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </>
          ) : null}
        </ScrollView>
      ) : (
        <>
          <View style={styles.stage}>
            <Animated.View style={[styles.imageWrap, { opacity: showAnswerOverlay ? 0 : frontFade }]}>
              {displayUri ? (
                <Image source={{ uri: displayUri }} style={styles.image} resizeMode="contain" />
              ) : (
                <View style={[styles.image, styles.imageMissing]} />
              )}
              {phase === 'front' && (
                <View
                  style={[
                    styles.frontBadge,
                    showingBack && styles.backBadge,
                  ]}>
                  <Text style={styles.frontBadgeText}>{sideBadge}</Text>
                </View>
              )}
            </Animated.View>

            {showAnswerOverlay && resolvedAnswerUri && (
              <Image source={{ uri: resolvedAnswerUri }} style={styles.image} resizeMode="contain" />
            )}

            {phase === 'peek' && resolvedAnswerUri && (
              <View style={styles.peekOverlay}>
                <Image source={{ uri: resolvedAnswerUri }} style={styles.image} resizeMode="contain" />
                <Text style={styles.peekHint}>{t('review.hintPeek')}</Text>
              </View>
            )}

            {phase === 'pass' && !scheduleSheetVisible && (
              <Animated.View style={[styles.passOverlay, { opacity: passAnim }]}>
                <Animated.View style={{ transform: [{ scale: passScale }] }}>
                  <Text style={styles.passEmoji}>🎉</Text>
                  <Text style={styles.passTitle}>{t('review.passTitle')}</Text>
                  <Text style={styles.passSub}>{t('review.passScore', { score: lastPassScore })}</Text>
                </Animated.View>
              </Animated.View>
            )}
          </View>

          {phase === 'front' && !auto && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={styles.progress}>
            {index + 1} / {slides.length}
            {!hasAnswer && ` · ${t('review.pairIncomplete')}`}
          </Text>
          <Text style={styles.durationLabel}>{t('review.countdownDuration')}</Text>
          <View style={styles.durationRow}>
            {RECALL_COUNTDOWN_OPTIONS.map((sec) => (
              <Pressable
                key={sec}
                onPress={() => setRecallCountdownSec(sec)}
                style={[
                  styles.durationChip,
                  recallCountdownSec === sec && styles.durationChipOn,
                ]}>
                <Text
                  style={[
                    styles.durationChipText,
                    recallCountdownSec === sec && styles.durationChipTextOn,
                  ]}>
                  {t('review.timerSec', { sec })}
                </Text>
              </Pressable>
            ))}
          </View>
          <Button label={t('review.startCountdown')} onPress={startCountdown} />
        </View>
          )}

          {phase === 'front' && auto && (
            <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
              <Text style={styles.durationLabel}>{t('review.slideDuration')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.durationRow}>
                  <Pressable
                    onPress={() => setSessionSlideSec(null)}
                    style={[styles.durationChip, sessionSlideSec === null && styles.durationChipOn]}>
                    <Text
                      style={[
                        styles.durationChipText,
                        sessionSlideSec === null && styles.durationChipTextOn,
                      ]}>
                      {t('common.default')}
                    </Text>
                  </Pressable>
                  {slideSecOptions.map((sec) => (
                    <Pressable
                      key={sec}
                      onPress={() => setSessionSlideSec(sec)}
                      style={[
                        styles.durationChip,
                        sessionSlideSec === sec && styles.durationChipOn,
                      ]}>
                      <Text
                        style={[
                          styles.durationChipText,
                          sessionSlideSec === sec && styles.durationChipTextOn,
                        ]}>
                        {current.side === 'back'
                          ? formatAnswerSlideshowLabel(sec)
                          : t('review.timerSec', { sec })}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </>
      )}

      <Modal visible={adVisible} transparent animationType="fade" onRequestClose={dismissFailAd}>
        <View style={styles.ad}>
          <Text style={styles.adTitle}>{t('review.adTitle')}</Text>
          <Text style={styles.adSub}>{t('review.adWait')}</Text>
          <Pressable onPress={dismissFailAd} style={styles.adSkip}>
            <Text style={styles.adSkipText}>{t('review.skipAd')}</Text>
          </Pressable>
        </View>
      </Modal>

      <Modal visible={hintOffer} transparent animationType="fade">
        <View style={styles.ad}>
          <Text style={styles.adTitle}>{t('review.hintTitle')}</Text>
          <Text style={styles.adSub}>{t('review.hintAdSub')}</Text>
          <Pressable onPress={watchHintAd}>
            <Text style={styles.hintBtn}>{t('review.watchAd')}</Text>
          </Pressable>
          <Pressable onPress={() => setHintOffer(false)}>
            <Text style={styles.cancel}>{t('common.cancel')}</Text>
          </Pressable>
        </View>
      </Modal>

      <ScheduleAdvanceSheet
        visible={scheduleSheetVisible}
        score={lastPassScore}
        nextReviewDate={
          nextReviewDateLabel ? t('review.advanceNextDate', { date: nextReviewDateLabel }) : null
        }
        title={t('review.advanceTitle')}
        body={t('review.advanceBody')}
        yesLabel={t('review.advanceYes')}
        noLabel={t('review.advanceNo')}
        onYes={onScheduleYes}
        onNo={onScheduleNo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.blackPure },
  rootRecall: { backgroundColor: theme.beige },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  topBarRecall: {
    backgroundColor: theme.beige,
    borderBottomWidth: 1,
    borderBottomColor: theme.grayLight,
  },
  topBarDarkText: { color: theme.black },
  topBarDarkMuted: { color: theme.gray },
  topBarLeft: { flex: 1, minWidth: 0 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  premiumToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  premiumLabel: { color: theme.white, fontSize: theme.font.caption, fontWeight: '700' },
  premiumLocked: { flex: 1 },
  premiumLockedText: { color: theme.grayMuted, fontSize: 11, fontWeight: '600' },
  slideshowProgress: { color: theme.white, fontSize: theme.font.caption, fontWeight: '700' },
  timerBadge: {
    minWidth: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,107,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.white,
  },
  timerBadgeRecall: {
    backgroundColor: theme.orangeMuted,
    borderColor: theme.orange,
  },
  timerBadgeText: { color: theme.white, fontSize: 22, fontWeight: '900' },
  close: { padding: 4 },
  closeText: { color: theme.white, fontSize: 22 },
  stage: { flex: 1, position: 'relative' },
  imageWrap: { flex: 1 },
  image: { flex: 1, width: '100%' },
  imageMissing: { backgroundColor: theme.grayLight },
  frontBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255,107,0,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
  },
  frontBadgeText: { color: theme.white, fontWeight: '800', fontSize: 11 },
  backBadge: { backgroundColor: 'rgba(37,99,235,0.92)' },
  recallScroll: { flex: 1 },
  recallFull: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
    alignItems: 'center',
  },
  problemStage: {
    alignSelf: 'center',
    position: 'relative',
    backgroundColor: theme.white,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.grayLight,
    overflow: 'hidden',
  },
  countdownOnImage: {
    position: 'absolute',
    top: 10,
    right: 10,
    minWidth: 44,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,107,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  countdownOnImageText: {
    color: theme.white,
    fontWeight: '900',
    fontSize: 22,
  },
  durationLabel: {
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.gray,
    marginTop: 4,
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  durationChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.grayLight,
    backgroundColor: theme.surface,
  },
  durationChipOn: { backgroundColor: theme.orange, borderColor: theme.orange },
  durationChipText: { fontWeight: '700', color: theme.black, fontSize: theme.font.caption },
  durationChipTextOn: { color: theme.white },
  recallActions: { gap: 8, paddingTop: 4 },
  peekOverlay: { ...StyleSheet.absoluteFill, backgroundColor: theme.beige },
  peekHint: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    width: '100%',
    textAlign: 'center',
    color: theme.orange,
    fontWeight: '800',
  },
  recallTitle: {
    fontSize: theme.font.caption,
    fontWeight: '800',
    color: theme.gray,
    marginTop: 4,
    zIndex: 1,
  },
  warn: { fontSize: 11, color: theme.orange, fontWeight: '600' },
  hintLink: { color: theme.orange, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  hintDisabled: { opacity: 0.4 },
  footer: { paddingTop: 20, paddingHorizontal: 20, backgroundColor: theme.beige, gap: 8 },
  progress: { textAlign: 'center', color: theme.gray },
  passOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,107,0,0.92)',
  },
  passEmoji: { color: theme.white, fontSize: 56, textAlign: 'center', marginBottom: 8 },
  passTitle: { color: theme.white, fontSize: 32, fontWeight: '900', textAlign: 'center' },
  passSub: { color: theme.white, marginTop: 8, fontWeight: '600', textAlign: 'center' },
  ad: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  adTitle: { color: theme.white, fontSize: 22, fontWeight: '800' },
  adSub: { color: theme.grayMuted, marginTop: 12, textAlign: 'center' },
  adSkip: { marginTop: 20, paddingVertical: 10, paddingHorizontal: 20 },
  adSkipText: { color: theme.white, fontWeight: '700', fontSize: theme.font.body },
  emptyRoot: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  emptyTitle: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.gray,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  hintBtn: { color: theme.orange, fontWeight: '800', marginTop: 24, fontSize: 18 },
  cancel: { color: theme.white, marginTop: 16 },
});
