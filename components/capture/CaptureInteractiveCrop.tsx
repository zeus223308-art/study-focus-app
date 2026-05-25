import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { theme } from '@/constants/theme';
import {
  clampCropTransform,
  coverScale,
  initialCropTransform,
  MAX_ZOOM,
  MIN_ZOOM,
  type CropTransform,
} from '@/lib/files/interactive-crop';

type Props = {
  uri: string;
  onTransformChange?: (transform: CropTransform | null) => void;
};

function CropGrid({ crop }: { crop: { left: number; top: number; width: number; height: number } }) {
  const thirdW = crop.width / 3;
  const thirdH = crop.height / 3;
  return (
    <View
      style={[styles.gridWrap, { left: crop.left, top: crop.top, width: crop.width, height: crop.height }]}
      pointerEvents="none">
      {[1, 2].map((i) => (
        <View
          key={`v${i}`}
          style={[styles.gridLine, { left: thirdW * i, top: 0, width: 1, height: crop.height }]}
        />
      ))}
      {[1, 2].map((i) => (
        <View
          key={`h${i}`}
          style={[styles.gridLine, { left: 0, top: thirdH * i, width: crop.width, height: 1 }]}
        />
      ))}
    </View>
  );
}

export function CaptureInteractiveCrop({ uri, onTransformChange }: Props) {
  const { t } = useTranslation();
  const [layout, setLayout] = useState({ w: 0, h: 0 });
  const [imageSize, setImageSize] = useState({ w: 0, h: 0 });
  const [transform, setTransform] = useState<CropTransform | null>(null);
  const transformRef = useRef<CropTransform | null>(null);
  const panStartRef = useRef<CropTransform | null>(null);

  const applyTransform = useCallback(
    (next: CropTransform) => {
      const clamped = clampCropTransform(next);
      transformRef.current = clamped;
      setTransform(clamped);
      onTransformChange?.(clamped);
    },
    [onTransformChange]
  );

  useEffect(() => {
    Image.getSize(
      uri,
      (w, h) => setImageSize({ w, h }),
      () => setImageSize({ w: 0, h: 0 })
    );
  }, [uri]);

  useEffect(() => {
    if (imageSize.w < 2 || imageSize.h < 2 || layout.w < 8 || layout.h < 8) return;
    applyTransform(initialCropTransform(imageSize.w, imageSize.h, layout.w, layout.h));
  }, [applyTransform, imageSize.h, imageSize.w, layout.h, layout.w]);

  const baseScale = useMemo(() => {
    if (!transform) return 1;
    return coverScale(transform.imageWidth, transform.imageHeight, transform.crop.width, transform.crop.height);
  }, [transform]);

  const userZoom = transform ? transform.scale / baseScale : 1;

  const adjustZoom = (delta: number) => {
    if (!transform) return;
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, userZoom + delta));
    applyTransform({ ...transform, scale: baseScale * nextZoom });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          panStartRef.current = transformRef.current;
        },
        onPanResponderMove: (_, gesture) => {
          const start = panStartRef.current;
          if (!start) return;
          applyTransform({
            ...start,
            translateX: start.translateX + gesture.dx,
            translateY: start.translateY + gesture.dy,
          });
        },
      }),
    [applyTransform]
  );

  const display =
    transform && transform.crop.width > 0
      ? {
          width: transform.imageWidth * transform.scale,
          height: transform.imageHeight * transform.scale,
          left:
            transform.crop.left +
            transform.crop.width / 2 -
            (transform.imageWidth * transform.scale) / 2 +
            transform.translateX,
          top:
            transform.crop.top +
            transform.crop.height / 2 -
            (transform.imageHeight * transform.scale) / 2 +
            transform.translateY,
        }
      : null;

  const crop = transform?.crop;

  return (
    <View
      style={styles.root}
      onLayout={(e: LayoutChangeEvent) => {
        const { width, height } = e.nativeEvent.layout;
        setLayout({ w: width, h: height });
      }}
      {...panResponder.panHandlers}>
      {display ? (
        <Image
          source={{ uri }}
          style={[
            styles.image,
            {
              width: display.width,
              height: display.height,
              left: display.left,
              top: display.top,
            },
          ]}
          resizeMode="cover"
        />
      ) : null}

      {crop ? (
        <>
          <View style={[styles.dim, { top: 0, left: 0, right: 0, height: crop.top }]} pointerEvents="none" />
          <View
            style={[styles.dim, { top: crop.top + crop.height, left: 0, right: 0, bottom: 0 }]}
            pointerEvents="none"
          />
          <View
            style={[styles.dim, { top: crop.top, left: 0, width: crop.left, height: crop.height }]}
            pointerEvents="none"
          />
          <View
            style={[
              styles.dim,
              { top: crop.top, left: crop.left + crop.width, right: 0, height: crop.height },
            ]}
            pointerEvents="none"
          />
          <View
            pointerEvents="none"
            style={[
              styles.frame,
              { left: crop.left, top: crop.top, width: crop.width, height: crop.height },
            ]}
          />
          <CropGrid crop={crop} />
        </>
      ) : null}

      <View style={styles.zoomRow} pointerEvents="box-none">
        <Pressable style={styles.zoomBtn} onPress={() => adjustZoom(-0.2)}>
          <Text style={styles.zoomBtnText}>−</Text>
        </Pressable>
        <Text style={styles.hint}>{t('capture.kakaoCropHint')}</Text>
        <Pressable style={styles.zoomBtn} onPress={() => adjustZoom(0.2)}>
          <Text style={styles.zoomBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.blackPure,
    overflow: 'hidden',
  },
  image: { position: 'absolute' },
  dim: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.6)' },
  frame: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  gridWrap: { position: 'absolute' },
  gridLine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.35)' },
  zoomRow: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  zoomBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnText: { color: theme.white, fontSize: 20, fontWeight: '700' },
  hint: {
    flex: 1,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
  },
});
