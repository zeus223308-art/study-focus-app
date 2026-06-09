import { parseISO } from 'date-fns';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Image,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RecallWorkCard, type ScratchTextBox } from '@/components/review/RecallWorkCard';
import { ReviewDebriefPanel } from '@/components/review/ReviewDebriefPanel';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { safeRouterBack } from '@/lib/navigation/safe-back';
import { computeReviewCardSizes } from '@/lib/ui/landscape-card-layout';
import { useViewportLayout } from '@/lib/ui/viewport-layout';
import { useApp } from '@/context/AppContext';
import type { InkStroke, NoteBundle, NotePage } from '@/lib/domain/types';
import {
  buildCountdownSteps,
} from '@/lib/review/blackout';
import { getFullImageUri } from '@/lib/files/display-image-uri';
import { getFullUriCandidates } from '@/lib/files/asset-uri-utils';
import { resolveFirstReadableUri, resolveImageUri } from '@/lib/files/resolve-image-uri';
import { getAnswerImageUri } from '@/lib/review/answer-text';
import {
  ANSWER_SLIDESHOW_SECONDS,
  FRONT_SLIDESHOW_SECONDS,
  formatAnswerSlideshowLabel,
  slideshowMsForSide,
} from '@/lib/domain/slideshow-timing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { isDueOnDate } from '@/lib/spacing/engine';
import {
  parseReviewPageKeys,
  reviewPageKey,
  routeParamString,
} from '@/lib/review/parse-review-pages';

const HINT_PEEK_MS = 8000;

const problemImageBlurWeb: ImageStyle =
  Platform.OS === 'web'
    ? ({ filter: 'blur(6px)', WebkitFilter: 'blur(6px)' } as ImageStyle)
    : {};

/** Mobile Safari (RN Web): opacity with useNativeDriver often never runs — overlay stays invisible. */
function runRevealAnim(passAnim: Animated.Value, passScale: Animated.Value) {
  passAnim.setValue(0);
  passScale.setValue(0.7);
  if (Platform.OS === 'web') {
    passAnim.setValue(1);
    passScale.setValue(1);
    return;
  }
  Animated.parallel([
    Animated.timing(passAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
    Animated.spring(passScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
  ]).start();
}
type SlideSide = 'front' | 'back';
type Slide = { bundle: NoteBundle; page: NotePage; side: SlideSide };
type Phase = 'front' | 'countdown' | 'recall-work' | 'peek' | 'debrief';

type SubmittedRecall = {
  strokes: InkStroke[];
  textBoxes: ScratchTextBox[];
};

export default function ReviewSessionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    bundleId?: string;
    subjectId?: string;
    subjectIds?: string;
    reviewPages?: string;
    startPage?: string;
    slideshow?: string;
    blackout?: string;
    reviewDate?: string;
  }>();
  const {
    dueToday,
    dueSelected,
    data,
    completeReview,
    getSchedule,
    storage,
    markSubjectReviewCompleted,
  } = useApp();

  const reviewDate = routeParamString(params.reviewDate);
  const isBlackout = params.blackout === '1';

  const slides = useMemo<Slide[]>(() => {
    const pickedSubjectIds = routeParamString(params.subjectIds)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const pickedPages = parseReviewPageKeys(params.reviewPages);
    const pickedPageKeys = new Set(pickedPages.map(reviewPageKey));

    let bundles;
    if (params.bundleId) {
      bundles = data.bundles.filter((b) => b.id === params.bundleId);
    } else if (pickedPages.length > 0) {
      const bundleIds = new Set(pickedPages.map((p) => p.bundleId));
      bundles = data.bundles.filter((b) => !b.archived && bundleIds.has(b.id));
    } else if (pickedSubjectIds.length > 0) {
      bundles = data.bundles.filter(
        (b) => !b.archived && pickedSubjectIds.includes(b.subjectId)
      );
    } else if (dueSelected.length > 0) {
      bundles = dueSelected;
    } else {
      bundles = dueToday;
    }
    if (params.subjectId) {
      bundles = bundles.filter((b) => b.subjectId === params.subjectId);
    }
    if (reviewDate && /^\d{4}-\d{2}-\d{2}$/.test(reviewDate)) {
      const before = bundles;
      const d = parseISO(`${reviewDate}T12:00:00`);
      const filtered = bundles.filter((b) => {
        const s = getSchedule(b.review.reviewScheduleId);
        return s ? isDueOnDate(b, s, d) : false;
      });
      // If nothing is due on that day, allow manual/extra review (fallback to all in scope).
      bundles = filtered.length > 0 ? filtered : before;
    }
    const isSlideshow = params.slideshow === '1';
    const list: Slide[] = [];
    for (const bundle of bundles) {
      for (const page of bundle.pages) {
        if (pickedPageKeys.size > 0 && !pickedPageKeys.has(reviewPageKey({ bundleId: bundle.id, pageId: page.id }))) {
          continue;
        }
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
    params.reviewPages,
    params.slideshow,
    reviewDate,
    getSchedule,
    dueSelected,
    dueToday,
    data.bundles,
  ]);

  const isDashboardReview = useMemo(() => {
    const pickedSubjectIds = routeParamString(params.subjectIds)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return pickedSubjectIds.length > 0 && !params.bundleId;
  }, [params.subjectIds, params.bundleId]);

  const initialSlideIndex = useMemo(() => {
    const n = Number.parseInt(routeParamString(params.startPage), 10);
    if (!Number.isFinite(n) || n < 0) return 0;
    return n;
  }, [params.startPage]);

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('front');
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const slideCountRef = useRef(slides.length);
  slideCountRef.current = slides.length;

  useEffect(() => {
    if (slides.length === 0) {
      setIndex(0);
      return;
    }
    setIndex(Math.min(initialSlideIndex, slides.length - 1));
  }, [slides.length, initialSlideIndex]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recallStrokes, setRecallStrokes] = useState<InkStroke[]>([]);
  const [textBoxes, setTextBoxes] = useState<ScratchTextBox[]>([]);
  const [problemCompleteVisible, setProblemCompleteVisible] = useState(false);
  const [sessionCompleteVisible, setSessionCompleteVisible] = useState(false);
  const [recallScrollLocked, setRecallScrollLocked] = useState(false);
  const [submittedRecall, setSubmittedRecall] = useState<SubmittedRecall | null>(null);
  const [passAnim] = useState(() => new Animated.Value(0));
  const passScale = useRef(new Animated.Value(0.7)).current;
  const blackoutStartedRef = useRef(false);
  const frontFade = useRef(new Animated.Value(1)).current;
  const problemShift = useRef(new Animated.Value(0)).current;
  const viewport = useViewportLayout();
  const recallSidePad = viewport.isLandscape ? 12 : 20;
  const [recallViewW, setRecallViewW] = useState(0);
  const reviewCards = computeReviewCardSizes(
    viewport,
    recallViewW > 0 ? recallViewW : viewport.width,
    recallSidePad
  );
  const workCardW = reviewCards.width;
  const problemCardH = viewport.isLandscape
    ? reviewCards.height
    : Math.round(workCardW * 0.46);
  const workCardH = reviewCards.height;
  const [resolvedFrontUri, setResolvedFrontUri] = useState<string | null>(null);
  const [resolvedAnswerUri, setResolvedAnswerUri] = useState<string | null>(null);
  const recallCountdownSec = 3;
  const [sessionSlideSec, setSessionSlideSec] = useState<number | null>(null);
  const [slideRemainingSec, setSlideRemainingSec] = useState(0);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goPrevSlide = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNextSlide = useCallback(() => {
    setIndex((i) => Math.min(slideCountRef.current - 1, i + 1));
  }, []);

  const slideSwipePan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        phaseRef.current === 'front' &&
        slideCountRef.current > 1 &&
        Math.abs(g.dx) > 16 &&
        Math.abs(g.dx) > Math.abs(g.dy) * 1.25,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -48) goNextSlide();
        else if (g.dx > 48) goPrevSlide();
      },
    })
  ).current;

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  const current = slides[index];
  const frontUri = getFullImageUri(current?.page.asset);
  const answerUri = current ? getAnswerImageUri(current.page) : null;

  useEffect(() => {
    let cancelled = false;
    if (!current?.page.asset) {
      setResolvedFrontUri(null);
      return;
    }
    const candidates = getFullUriCandidates(current.page.asset);
    void resolveFirstReadableUri(candidates).then((u) => {
      if (cancelled) return;
      if (u) {
        setResolvedFrontUri(u);
        return;
      }
      // Fallback for legacy data that still stores a directly readable URI.
      void resolveImageUri(frontUri).then((legacy) => {
        if (!cancelled) setResolvedFrontUri(legacy);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [frontUri, current?.page.asset, current?.page.id, current?.side]);

  useEffect(() => {
    let cancelled = false;
    if (!current?.page.answerAsset) {
      setResolvedAnswerUri(null);
      return;
    }
    const candidates = getFullUriCandidates(current.page.answerAsset);
    void resolveFirstReadableUri(candidates).then((u) => {
      if (cancelled) return;
      if (u) {
        setResolvedAnswerUri(u);
        return;
      }
      void resolveImageUri(answerUri).then((legacy) => {
        if (!cancelled) setResolvedAnswerUri(legacy);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [answerUri, current?.page.answerAsset, current?.page.id]);
  const auto = params.slideshow === '1';
  const isPro = data.settings.tier === 'pro';

  const resetSlide = useCallback(() => {
    setPhase('front');
    setCountdown(null);
    setRecallStrokes([]);
    setTextBoxes([]);
    problemShift.setValue(0);
    setProblemCompleteVisible(false);
    setSubmittedRecall(null);
    blackoutStartedRef.current = false;
    frontFade.setValue(1);
    passAnim.setValue(0);
    passScale.setValue(0.7);
  }, [frontFade, passAnim, passScale]);

  useEffect(() => {
    resetSlide();
  }, [index, resetSlide]);

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

  useEffect(() => {
    if (!isBlackout || auto || phase !== 'front' || !current) return;
    if (blackoutStartedRef.current) return;
    blackoutStartedRef.current = true;
    startCountdown();
  }, [index, isBlackout, auto, phase, current]);

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

  const finishAfterComplete = useCallback(() => {
    passAnim.setValue(0);
    passScale.setValue(0.7);
    setRecallStrokes([]);
    setTextBoxes([]);
    setSubmittedRecall(null);
    setProblemCompleteVisible(false);
    setPhase('front');
    if (index < slides.length - 1) {
      setIndex((i) => i + 1);
    } else {
      passAnim.setValue(0);
      passScale.setValue(0.7);
      setSessionCompleteVisible(true);
      runRevealAnim(passAnim, passScale);
    }
  }, [index, passAnim, passScale, slides.length]);

  const finishDebrief = useCallback(() => {
    if (isDashboardReview) {
      finishSession();
      return;
    }
    finishAfterComplete();
  }, [finishAfterComplete, finishSession, isDashboardReview]);

  const showProblemComplete = useCallback(() => {
    setProblemCompleteVisible(true);
    runRevealAnim(passAnim, passScale);
  }, [passAnim, passScale]);

  const confirmProblemComplete = useCallback(() => {
    const subjectId = slides[index]?.bundle.subjectId;
    if (subjectId && reviewDate) {
      markSubjectReviewCompleted(reviewDate, subjectId);
    }
    setProblemCompleteVisible(false);
    passAnim.setValue(0);
    passScale.setValue(0.7);
    setPhase('debrief');
  }, [index, markSubjectReviewCompleted, passAnim, passScale, reviewDate, slides]);

  const dismissSessionComplete = useCallback(() => {
    setSessionCompleteVisible(false);
    finishSession();
  }, [finishSession]);

  const submitRecall = () => {
    if (!current) return;
    setSubmittedRecall({
      strokes: recallStrokes,
      textBoxes: textBoxes,
    });
    completeReview(current.bundle.id);
    showProblemComplete();
  };

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

  const hasAnswer = Boolean(answerUri);
  const recallMode =
    phase === 'recall-work' ||
    phase === 'countdown' ||
    (isBlackout && phase === 'front');
  const debriefMode = phase === 'debrief';
  const problemLiftY = problemShift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0],
  });
  const showingBack = current.side === 'back' && Boolean(answerUri);
  const displayUri = showingBack ? resolvedAnswerUri : resolvedFrontUri;
  const timerDisplaySec =
    phase === 'countdown' ? null : auto && phase === 'front' ? slideRemainingSec : null;
  const slideSecOptions =
    current.side === 'back' ? ANSWER_SLIDESHOW_SECONDS : FRONT_SLIDESHOW_SECONDS;

  return (
    <View style={[styles.root, (recallMode || debriefMode) && styles.rootRecall]}>
      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + 8 },
          recallMode && styles.topBarRecall,
          debriefMode && styles.topBarRecall,
        ]}>
        <View style={styles.topBarLeft}>
          {auto ? (
            <Text style={[styles.slideshowProgress, (recallMode || debriefMode) && styles.topBarDarkText]}>
              {index + 1} / {slides.length}
            </Text>
          ) : null}
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
            <Text style={[styles.closeText, (recallMode || debriefMode) && styles.topBarDarkText]}>{t('common.close')}</Text>
          </Pressable>
        </View>
      </View>

      {debriefMode && submittedRecall ? (
        <ReviewDebriefPanel
          frontUri={resolvedFrontUri}
          answerUri={resolvedAnswerUri}
          hasAnswer={hasAnswer}
          cardWidth={workCardW}
          problemHeight={problemCardH}
          workHeight={workCardH}
          strokes={submittedRecall.strokes}
          textBoxes={submittedRecall.textBoxes}
          bottomInset={insets.bottom}
          onNext={finishDebrief}
          nextLabel={
            isDashboardReview
              ? t('common.done')
              : index < slides.length - 1
                ? t('review.next')
                : t('common.done')
          }
        />
      ) : recallMode ? (
        <ScrollView
          style={styles.recallScroll}
          contentContainerStyle={[
            styles.recallFull,
            { paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          nestedScrollEnabled
          scrollEnabled={!recallScrollLocked}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            if (w > 0) setRecallViewW(w);
          }}>
          <Animated.View
            style={[
              styles.problemStage,
              { width: workCardW, height: problemCardH, transform: [{ translateY: problemLiftY }] },
            ]}>
            {resolvedFrontUri ? (
              <Image
                source={{ uri: resolvedFrontUri }}
                style={[
                  { width: workCardW, height: problemCardH },
                  problemCompleteVisible && styles.problemImageDim,
                  problemCompleteVisible && problemImageBlurWeb,
                ]}
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
            {problemCompleteVisible ? (
              <Animated.View
                style={[styles.problemCompleteOverlay, { opacity: passAnim }]}
                pointerEvents="box-none">
                <View style={styles.problemCompleteScrim} />
                <Animated.View
                  style={[
                    styles.problemCompleteContent,
                    { transform: [{ scale: passScale }] },
                  ]}>
                  <Text style={styles.problemCompleteCheck}>✓</Text>
                  <Text style={styles.problemCompleteTitle}>{t('review.reviewComplete')}</Text>
                  <Button
                    label={t('common.confirm')}
                    onPress={confirmProblemComplete}
                    style={styles.problemCompleteBtn}
                  />
                </Animated.View>
              </Animated.View>
            ) : null}
          </Animated.View>

          {phase === 'recall-work' && !problemCompleteVisible ? (
            <>
              <RecallWorkCard
                width={workCardW}
                height={workCardH}
                strokes={recallStrokes}
                onStrokesChange={setRecallStrokes}
                textBoxes={textBoxes}
                onTextBoxesChange={setTextBoxes}
                onGestureLockChange={setRecallScrollLocked}
              />
              {!hasAnswer ? <Text style={styles.warn}>{t('review.noBackPhoto')}</Text> : null}
              <View style={styles.recallActions}>
                <Button label={t('review.submitRecall')} onPress={submitRecall} />
              </View>
            </>
          ) : null}
        </ScrollView>
      ) : (
        <>
          <View
            style={styles.stage}
            {...(phase === 'front' && slides.length > 1 ? slideSwipePan.panHandlers : {})}>
            <Animated.View style={[styles.imageWrap, { opacity: frontFade }]}>
              {displayUri ? (
                <Image source={{ uri: displayUri }} style={styles.image} resizeMode="contain" />
              ) : (
                <View style={[styles.image, styles.imageMissing]} />
              )}
              {phase === 'front' && showingBack ? (
                <View style={[styles.frontBadge, styles.backBadge]}>
                  <Text style={styles.frontBadgeText}>{t('capture.backLabel')}</Text>
                </View>
              ) : null}
            </Animated.View>

            {phase === 'peek' && resolvedAnswerUri && (
              <View style={styles.peekOverlay}>
                <Image source={{ uri: resolvedAnswerUri }} style={styles.image} resizeMode="contain" />
                <Text style={styles.peekHint}>{t('review.hintPeek')}</Text>
              </View>
            )}
          </View>

          {phase === 'front' && !auto && !isBlackout && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={styles.progress}>
            {index + 1} / {slides.length}
            {!hasAnswer && ` · ${t('review.pairIncomplete')}`}
          </Text>
          {slides.length > 1 ? (
            <Text style={styles.swipeHint}>{t('review.swipeProblems')}</Text>
          ) : null}
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

      {sessionCompleteVisible ? (
        <View style={styles.completionOverlay}>
          <View style={styles.completionBackdrop} />
          <Animated.View
            style={[
              styles.completionCard,
              { opacity: passAnim, transform: [{ scale: passScale }] },
            ]}>
            <Text style={styles.passEmoji}>✓</Text>
            <Text style={styles.passTitle}>{t('review.todayReviewComplete')}</Text>
            <Button
              label={t('common.confirm')}
              onPress={dismissSessionComplete}
              style={styles.completionBtn}
            />
          </Animated.View>
        </View>
      ) : null}

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, backgroundColor: theme.blackPure },
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
  recallScroll: { flex: 1, minHeight: 0 },
  recallFull: {
    flexGrow: 1,
    paddingTop: 8,
    paddingHorizontal: 4,
    gap: 12,
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
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
  problemImageDim: { opacity: 0.35 },
  problemCompleteOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  problemCompleteScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  problemCompleteContent: {
    zIndex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    maxWidth: '92%',
  },
  problemCompleteCheck: {
    color: theme.white,
    fontSize: 44,
    fontWeight: '900',
    marginBottom: 6,
  },
  problemCompleteTitle: {
    color: theme.white,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16,
  },
  problemCompleteBtn: { minWidth: 160 },
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
  durationChipTextOn: { color: theme.onAccent },
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
  footer: { paddingTop: 20, paddingHorizontal: 20, backgroundColor: theme.beige, gap: 8 },
  progress: { textAlign: 'center', color: theme.gray, fontWeight: '700', marginBottom: 4 },
  swipeHint: {
    color: theme.grayMuted,
    fontSize: theme.font.caption,
    textAlign: 'center',
    marginBottom: 12,
  },
  passOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,107,0,0.92)',
  },
  completionOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  completionBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  completionCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: theme.orange,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    alignItems: 'center',
    zIndex: 1,
  },
  completionBtn: { alignSelf: 'stretch', marginTop: 20 },
  passEmoji: { color: theme.white, fontSize: 56, textAlign: 'center', marginBottom: 8 },
  passTitle: { color: theme.white, fontSize: 32, fontWeight: '900', textAlign: 'center' },
  emptyRoot: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  emptyTitle: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.gray,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
