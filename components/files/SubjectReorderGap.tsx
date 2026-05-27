import { useCallback, useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { subjectReorderGapKey } from '@/lib/domain/reorder';
import { SUBJECT_GAP_HIT_MIN } from '@/lib/ui/subject-reorder-hit';

type Rect = { x: number; y: number; width: number; height: number };

type Props = {
  gapIndex: number;
  width: number;
};

/** Narrow drop strip between vault subject cards (reorder only). */
export function SubjectReorderGap({ gapIndex, width }: Props) {
  const ref = useRef<View>(null);
  const gapKey = subjectReorderGapKey(gapIndex);
  const {
    reorderingSubjectId,
    reorderHoverGapKey,
    registerSubjectReorderGapZone,
    subjectReorderMeasureTick,
  } = useApp();

  const register = useCallback(
    (key: string, rect: Rect | null) => registerSubjectReorderGapZone(key, rect),
    [registerSubjectReorderGapZone]
  );

  const measure = useCallback(() => {
    ref.current?.measureInWindow((x, y, _w, height) => {
      const pad = Math.max(0, (SUBJECT_GAP_HIT_MIN - width) / 2);
      register(gapKey, {
        x: x - pad,
        y,
        width: width + pad * 2,
        height,
      });
    });
  }, [gapKey, register, width]);

  useEffect(() => {
    measure();
    return () => register(gapKey, null);
  }, [gapKey, measure, register, subjectReorderMeasureTick]);

  const showSlot = Boolean(reorderingSubjectId);
  const hover = reorderHoverGapKey === gapKey;
  const layoutWidth =
    showSlot && Platform.OS !== 'web' ? Math.max(width, SUBJECT_GAP_HIT_MIN) : width;

  if (!showSlot) {
    return <View style={{ width }} pointerEvents="none" />;
  }

  return (
    <View
      ref={ref}
      onLayout={measure}
      style={[styles.gap, { width: layoutWidth }, hover && styles.gapHover]}
      pointerEvents="box-only">
      {hover ? <View style={styles.line} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 120,
  },
  gapHover: {
    backgroundColor: theme.orangeMuted,
  },
  line: {
    width: 3,
    flex: 1,
    maxHeight: '88%',
    minHeight: 72,
    borderRadius: 2,
    backgroundColor: theme.orange,
  },
});
