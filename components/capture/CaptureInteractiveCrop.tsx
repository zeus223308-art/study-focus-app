import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { theme } from '@/constants/theme';
import {
  clampCropSelection,
  imageContainRect,
  initialCropSelection,
  type CropRect,
  type CropSelection,
} from '@/lib/files/interactive-crop';

type HandleId = 'move' | 'tl' | 'tr' | 'bl' | 'br';

type Props = {
  uri: string;
  onSelectionChange?: (selection: CropSelection | null) => void;
};

function resizeFromHandle(
  start: CropRect,
  handle: HandleId,
  dx: number,
  dy: number,
  image: CropRect
): CropRect {
  let { left, top, width, height } = start;

  if (handle === 'tl') {
    const right = start.left + start.width;
    const bottom = start.top + start.height;
    left = Math.min(start.left + dx, right - 56);
    top = Math.min(start.top + dy, bottom - 56);
    width = right - left;
    height = bottom - top;
  } else if (handle === 'tr') {
    const bottom = start.top + start.height;
    top = Math.min(start.top + dy, bottom - 56);
    width = Math.max(56, start.width + dx);
    height = bottom - top;
  } else if (handle === 'bl') {
    const right = start.left + start.width;
    left = Math.min(start.left + dx, right - 56);
    width = right - left;
    height = Math.max(56, start.height + dy);
  } else if (handle === 'br') {
    width = Math.max(56, start.width + dx);
    height = Math.max(56, start.height + dy);
  } else {
    left = start.left + dx;
    top = start.top + dy;
  }

  return { left, top, width, height };
}

export function CaptureInteractiveCrop({ uri, onSelectionChange }: Props) {
  const { t } = useTranslation();
  const [layout, setLayout] = useState({ w: 0, h: 0 });
  const [imageSize, setImageSize] = useState({ w: 0, h: 0 });
  const [selection, setSelection] = useState<CropSelection | null>(null);
  const selectionRef = useRef<CropSelection | null>(null);
  const dragRef = useRef<{ handle: HandleId; startCrop: CropRect } | null>(null);

  const applySelection = useCallback(
    (next: CropSelection) => {
      const clamped = clampCropSelection(next);
      selectionRef.current = clamped;
      setSelection(clamped);
      onSelectionChange?.(clamped);
    },
    [onSelectionChange]
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
    applySelection(initialCropSelection(imageSize.w, imageSize.h, layout.w, layout.h));
  }, [applySelection, imageSize.h, imageSize.w, layout.h, layout.w]);

  const imageRect = useMemo(() => {
    if (!selection) return null;
    return imageContainRect(
      selection.imageWidth,
      selection.imageHeight,
      selection.viewportWidth,
      selection.viewportHeight
    );
  }, [selection]);

  const panResponders = useMemo(() => {
    const handles: HandleId[] = ['move', 'tl', 'tr', 'bl', 'br'];
    return handles.reduce(
      (acc, handle) => {
        acc[handle] = PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: () => true,
          onPanResponderGrant: () => {
            if (!selectionRef.current) return;
            dragRef.current = { handle, startCrop: { ...selectionRef.current.crop } };
          },
          onPanResponderMove: (_, gesture) => {
            const drag = dragRef.current;
            const current = selectionRef.current;
            const image = imageRect;
            if (!drag || !current || !image) return;

            const nextCrop = resizeFromHandle(
              drag.startCrop,
              drag.handle,
              gesture.dx,
              gesture.dy,
              image
            );
            applySelection({ ...current, crop: nextCrop });
          },
          onPanResponderRelease: () => {
            dragRef.current = null;
          },
        });
        return acc;
      },
      {} as Record<HandleId, ReturnType<typeof PanResponder.create>>
    );
  }, [applySelection, imageRect]);

  const crop = selection?.crop;

  return (
    <View
      style={styles.root}
      onLayout={(e: LayoutChangeEvent) => {
        const { width, height } = e.nativeEvent.layout;
        setLayout({ w: width, h: height });
      }}>
      {imageRect ? (
        <Image
          source={{ uri }}
          style={[
            styles.image,
            {
              left: imageRect.left,
              top: imageRect.top,
              width: imageRect.width,
              height: imageRect.height,
            },
          ]}
          resizeMode="contain"
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
            style={[
              styles.frame,
              { left: crop.left, top: crop.top, width: crop.width, height: crop.height },
            ]}
            {...panResponders.move.panHandlers}
          />
          <View
            style={[styles.handle, { left: crop.left - 14, top: crop.top - 14 }]}
            {...panResponders.tl.panHandlers}
          />
          <View
            style={[styles.handle, { left: crop.left + crop.width - 14, top: crop.top - 14 }]}
            {...panResponders.tr.panHandlers}
          />
          <View
            style={[styles.handle, { left: crop.left - 14, top: crop.top + crop.height - 14 }]}
            {...panResponders.bl.panHandlers}
          />
          <View
            style={[
              styles.handle,
              { left: crop.left + crop.width - 14, top: crop.top + crop.height - 14 },
            ]}
            {...panResponders.br.panHandlers}
          />
        </>
      ) : null}

      <Text style={styles.hint}>{t('capture.cropHandleHint')}</Text>
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
  },
  handle: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.white,
    borderWidth: 2,
    borderColor: theme.orange,
    zIndex: 4,
  },
  hint: {
    position: 'absolute',
    bottom: 10,
    left: 16,
    right: 16,
    textAlign: 'center',
    color: theme.white,
    fontSize: 12,
    fontWeight: '600',
  },
});
