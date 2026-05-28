import { useEffect, useRef } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';

import { styleForStroke } from '@/lib/domain/ink-stroke-style';
import type { InkPoint, InkStroke } from '@/lib/domain/types';

export type InkBakeJob = {
  uri: string;
  strokes: InkStroke[];
  width: number;
  height: number;
};

function pointsToPath(points: InkPoint[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  return `M ${first.x} ${first.y} ${rest.map((p) => `L ${p.x} ${p.y}`).join(' ')}`;
}

type Props = {
  job: InkBakeJob | null;
  onComplete: (uri: string) => void;
  onError: () => void;
};

export function CaptureInkBakeHost({ job, onComplete, onError }: Props) {
  const shotRef = useRef<View>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    if (!job || runningRef.current) return;
    runningRef.current = true;
    const timer = setTimeout(async () => {
      try {
        if (!shotRef.current) {
          onError();
          return;
        }
        const out = await captureRef(shotRef, {
          format: 'jpg',
          quality: 0.92,
          width: job.width,
          height: job.height,
        });
        onComplete(out);
      } catch {
        onError();
      } finally {
        runningRef.current = false;
      }
    }, 80);
    return () => {
      clearTimeout(timer);
      runningRef.current = false;
    };
  }, [job, onComplete, onError]);

  if (!job) return null;

  return (
    <View
      ref={shotRef}
      collapsable={false}
      style={[
        styles.offscreen,
        { width: job.width, height: job.height },
      ]}>
      <Image source={{ uri: job.uri }} style={{ width: job.width, height: job.height }} />
      <Svg width={job.width} height={job.height} style={StyleSheet.absoluteFill}>
        {job.strokes.map((s) => {
          const spec = styleForStroke(s);
          return (
            <Path
              key={s.id}
              d={pointsToPath(s.points)}
              stroke={spec.color}
              strokeWidth={s.width}
              strokeOpacity={s.opacity}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  offscreen: {
    position: 'absolute',
    left: -10000,
    top: 0,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
});
