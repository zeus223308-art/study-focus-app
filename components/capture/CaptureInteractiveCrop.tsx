import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import {
  clampCropSelection,
  imageContainRect,
  initialCropSelection,
  type CropRect,
  type CropSelection,
} from '@/lib/files/interactive-crop';
import { selectionMatchesLayout } from '@/lib/files/rotate-capture-edit';

type HandleId = 'move' | 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r';

const HANDLE_HIT = 36;
const EDGE_HIT = 22;

type Props = {
  uri: string;
  seedSelection?: CropSelection | null;
  onSeedApplied?: () => void;
  onSelectionChange?: (selection: CropSelection | null) => void;
};

function resizeCrop(start: CropRect, handle: HandleId, dx: number, dy: number): CropRect {
  let { left, top, width, height } = start;

  if (handle === 'move') {
    return { left: left + dx, top: top + dy, width, height };
  }
  if (handle === 'tl') {
    const right = start.left + start.width;
    const bottom = start.top + start.height;
    left = start.left + dx;
    top = start.top + dy;
    width = right - left;
    height = bottom - top;
  } else if (handle === 'tr') {
    const bottom = start.top + start.height;
    top = start.top + dy;
    width = start.width + dx;
    height = bottom - top;
  } else if (handle === 'bl') {
    const right = start.left + start.width;
    left = start.left + dx;
    width = right - left;
    height = start.height + dy;
  } else if (handle === 'br') {
    width = start.width + dx;
    height = start.height + dy;
  } else if (handle === 't') {
    top = start.top + dy;
    height = start.height - dy;
  } else if (handle === 'b') {
    height = start.height + dy;
  } else if (handle === 'l') {
    left = start.left + dx;
    width = start.width - dx;
  } else if (handle === 'r') {
    width = start.width + dx;
  }

  return { left, top, width, height };
}

function CropGrid({ crop }: { crop: CropRect }) {
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

export function CaptureInteractiveCrop({
  uri,
  seedSelection,
  onSeedApplied,
  onSelectionChange,
}: Props) {
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
    if (
      seedSelection &&
      selectionMatchesLayout(seedSelection, imageSize.w, imageSize.h, layout.w, layout.h)
    ) {
      applySelection(seedSelection);
      onSeedApplied?.();
      return;
    }
    applySelection(initialCropSelection(imageSize.w, imageSize.h, layout.w, layout.h));
  }, [applySelection, imageSize.h, imageSize.w, layout.h, layout.w, onSeedApplied, seedSelection]);

  const imageRect = useMemo(() => {
    if (!selection) return null;
    return imageContainRect(
      selection.imageWidth,
      selection.imageHeight,
      selection.viewportWidth,
      selection.viewportHeight
    );
  }, [selection]);

  const makeResponder = useCallback(
    (handle: HandleId) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          if (!selectionRef.current) return;
          dragRef.current = { handle, startCrop: { ...selectionRef.current.crop } };
        },
        onPanResponderMove: (_, gesture) => {
          const drag = dragRef.current;
          const current = selectionRef.current;
          if (!drag || !current) return;
          const nextCrop = resizeCrop(drag.startCrop, drag.handle, gesture.dx, gesture.dy);
          applySelection({ ...current, crop: nextCrop });
        },
        onPanResponderRelease: () => {
          dragRef.current = null;
        },
      }),
    [applySelection]
  );

  const panResponders = useMemo((): Record<HandleId, ReturnType<typeof PanResponder.create>> => {
    const handles: HandleId[] = ['move', 'tl', 'tr', 'bl', 'br', 't', 'b', 'l', 'r'];
    return handles.reduce(
      (acc, handle) => {
        acc[handle] = makeResponder(handle);
        return acc;
      },
      {} as Record<HandleId, ReturnType<typeof PanResponder.create>>
    );
  }, [makeResponder]);

  const crop = selection?.crop;
  const half = HANDLE_HIT / 2;

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
          style={{
            position: 'absolute',
            left: imageRect.left,
            top: imageRect.top,
            width: imageRect.width,
            height: imageRect.height,
          }}
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
          <CropGrid crop={crop} />

          {/* edge handles */}
          <View
            style={[
              styles.edgeHandle,
              {
                left: crop.left + crop.width / 2 - 20,
                top: crop.top - EDGE_HIT / 2,
                width: 40,
                height: EDGE_HIT,
              },
            ]}
            {...panResponders.t.panHandlers}
          />
          <View
            style={[
              styles.edgeHandle,
              {
                left: crop.left + crop.width / 2 - 20,
                top: crop.top + crop.height - EDGE_HIT / 2,
                width: 40,
                height: EDGE_HIT,
              },
            ]}
            {...panResponders.b.panHandlers}
          />
          <View
            style={[
              styles.edgeHandle,
              {
                left: crop.left - EDGE_HIT / 2,
                top: crop.top + crop.height / 2 - 20,
                width: EDGE_HIT,
                height: 40,
              },
            ]}
            {...panResponders.l.panHandlers}
          />
          <View
            style={[
              styles.edgeHandle,
              {
                left: crop.left + crop.width - EDGE_HIT / 2,
                top: crop.top + crop.height / 2 - 20,
                width: EDGE_HIT,
                height: 40,
              },
            ]}
            {...panResponders.r.panHandlers}
          />

          {/* corner handles */}
          <View
            style={[styles.cornerHandle, { left: crop.left - half, top: crop.top - half }]}
            {...panResponders.tl.panHandlers}
          />
          <View
            style={[styles.cornerHandle, { left: crop.left + crop.width - half, top: crop.top - half }]}
            {...panResponders.tr.panHandlers}
          />
          <View
            style={[styles.cornerHandle, { left: crop.left - half, top: crop.top + crop.height - half }]}
            {...panResponders.bl.panHandlers}
          />
          <View
            style={[
              styles.cornerHandle,
              { left: crop.left + crop.width - half, top: crop.top + crop.height - half },
            ]}
            {...panResponders.br.panHandlers}
          />
        </>
      ) : null}

      <Text style={styles.hint}>{t('capture.cropDragRegionHint')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.blackPure, overflow: 'hidden' },
  dim: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.6)' },
  frame: { position: 'absolute', borderWidth: 2, borderColor: theme.white },
  gridWrap: { position: 'absolute' },
  gridLine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.35)' },
  cornerHandle: {
    position: 'absolute',
    width: HANDLE_HIT,
    height: HANDLE_HIT,
    borderRadius: HANDLE_HIT / 2,
    backgroundColor: theme.white,
    borderWidth: 2,
    borderColor: theme.orange,
    zIndex: 5,
  },
  edgeHandle: {
    position: 'absolute',
    zIndex: 4,
  },
  hint: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    right: 12,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
  },
});
