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
  type CropTransform,
  initialCropTransform,
} from '@/lib/files/interactive-crop';

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const CROP_INSET = 20;

type Props = {
  uri: string;
  onTransformChange?: (transform: CropTransform | null) => void;
};

export function CaptureInteractiveCrop({ uri, onTransformChange }: Props) {
  const { t } = useTranslation();
  const [layout, setLayout] = useState({ w: 0, h: 0 });
  const [imageSize, setImageSize] = useState({ w: 0, h: 0 });
  const [transform, setTransform] = useState<CropTransform | null>(null);
  const transformRef = useRef<CropTransform | null>(null);

  const cropRect = useMemo(() => {
    const w = Math.max(0, layout.w - CROP_INSET * 2);
    const h = Math.max(0, layout.h - CROP_INSET * 2);
    return {
      left: (layout.w - w) / 2,
      top: (layout.h - h) / 2,
      width: w,
      height: h,
    };
  }, [layout]);

  const applyTransform = useCallback(
    (next: CropTransform) => {
      const clamped = clampCropTransform(next);
      transformRef.current = clamped;
      setTransform(clamped);
      onTransformChange?.(clamped);
    },
    [onTransformChange]
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setLayout({ w: width, h: height });
  };

  useEffect(() => {
    Image.getSize(
      uri,
      (w, h) => setImageSize({ w, h }),
      () => setImageSize({ w: 0, h: 0 })
    );
  }, [uri]);

  useEffect(() => {
    if (imageSize.w < 2 || imageSize.h < 2 || cropRect.width < 8 || cropRect.height < 8) return;
    applyTransform(initialCropTransform(imageSize.w, imageSize.h, cropRect.width, cropRect.height));
  }, [imageSize.w, imageSize.h, cropRect.width, cropRect.height, applyTransform]);

  const baseScale = useMemo(() => {
    if (!transform) return 1;
    return coverScale(transform.imageWidth, transform.imageHeight, cropRect.width, cropRect.height);
  }, [transform, cropRect.height, cropRect.width]);

  const userZoom = transform ? transform.scale / baseScale : 1;

  const adjustZoom = (delta: number) => {
    if (!transform) return;
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, userZoom + delta));
    applyTransform({
      ...transform,
      scale: baseScale * nextZoom,
    });
  };

  const panStartRef = useRef<CropTransform | null>(null);

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
    transform && cropRect.width > 0
      ? {
          width: transform.imageWidth * transform.scale,
          height: transform.imageHeight * transform.scale,
          left: cropRect.left + cropRect.width / 2 - (transform.imageWidth * transform.scale) / 2 + transform.translateX,
          top: cropRect.top + cropRect.height / 2 - (transform.imageHeight * transform.scale) / 2 + transform.translateY,
        }
      : null;

  return (
    <View style={styles.root} onLayout={onLayout} {...panResponder.panHandlers}>
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

      {cropRect.width > 0 ? (
        <>
          <View style={[styles.dim, { top: 0, left: 0, right: 0, height: cropRect.top }]} pointerEvents="none" />
          <View
            style={[styles.dim, { top: cropRect.top + cropRect.height, left: 0, right: 0, bottom: 0 }]}
            pointerEvents="none"
          />
          <View
            style={[
              styles.dim,
              { top: cropRect.top, left: 0, width: cropRect.left, height: cropRect.height },
            ]}
            pointerEvents="none"
          />
          <View
            style={[
              styles.dim,
              {
                top: cropRect.top,
                left: cropRect.left + cropRect.width,
                right: 0,
                height: cropRect.height,
              },
            ]}
            pointerEvents="none"
          />
          <View
            style={[
              styles.frame,
              {
                left: cropRect.left,
                top: cropRect.top,
                width: cropRect.width,
                height: cropRect.height,
              },
            ]}
            pointerEvents="none"
          />
        </>
      ) : null}

      <View style={styles.zoomRow} pointerEvents="box-none">
        <Pressable style={styles.zoomBtn} onPress={() => adjustZoom(-0.25)}>
          <Text style={styles.zoomBtnText}>−</Text>
        </Pressable>
        <Text style={styles.zoomHint}>{t('capture.cropDragHint')}</Text>
        <Pressable style={styles.zoomBtn} onPress={() => adjustZoom(0.25)}>
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
  image: {
    position: 'absolute',
  },
  dim: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  frame: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: theme.white,
    borderRadius: 2,
  },
  zoomRow: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  zoomBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  zoomBtnText: {
    color: theme.white,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
  },
  zoomHint: {
    flex: 1,
    textAlign: 'center',
    color: theme.white,
    fontSize: 12,
    fontWeight: '600',
  },
});
