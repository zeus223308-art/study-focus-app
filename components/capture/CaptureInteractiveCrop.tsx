import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, LayoutChangeEvent, Platform, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import {
  clampCropSelection,
  imageDisplayRect,
  initialCropSelection,
  type CropRect,
  type CropSelection,
} from '@/lib/files/interactive-crop';
import { selectionMatchesLayout } from '@/lib/files/rotate-capture-edit';
import { useDragHandlers } from '@/lib/ui/use-drag-handlers';

type HandleId = 'move' | 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r' | 'image';

const HANDLE_HIT = 44;
const EDGE_HIT = 28;

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
  const dragRef = useRef<{
    handle: HandleId;
    startCrop: CropRect;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);
  const didInitRef = useRef(false);
  const appliedSeedRef = useRef(false);

  const applySelection = useCallback(
    (next: CropSelection) => {
      const clamped = clampCropSelection(next);
      selectionRef.current = clamped;
      setSelection(clamped);
      onSelectionChange?.(clamped);
    },
    [onSelectionChange]
  );

  const onCropDrag = useCallback(
    (handle: HandleId, dx: number, dy: number) => {
      const drag = dragRef.current;
      const current = selectionRef.current;
      if (!drag || !current || drag.handle !== handle) return;

      if (handle === 'image') {
        applySelection({
          ...current,
          imageOffsetX: drag.startOffsetX + dx,
          imageOffsetY: drag.startOffsetY + dy,
        });
        return;
      }

      const nextCrop = resizeCrop(drag.startCrop, handle, dx, dy);
      applySelection({ ...current, crop: nextCrop });
    },
    [applySelection]
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  const grantDrag = useCallback((handle: HandleId) => {
    if (!selectionRef.current) return;
    const cur = selectionRef.current;
    dragRef.current = {
      handle,
      startCrop: { ...cur.crop },
      startOffsetX: cur.imageOffsetX ?? 0,
      startOffsetY: cur.imageOffsetY ?? 0,
    };
  }, []);

  const moveDrag = useDragHandlers({
    onGrant: () => grantDrag('move'),
    onDrag: (dx, dy) => onCropDrag('move', dx, dy),
    onEnd: endDrag,
  });
  const tlDrag = useDragHandlers({
    onGrant: () => grantDrag('tl'),
    onDrag: (dx, dy) => onCropDrag('tl', dx, dy),
    onEnd: endDrag,
  });
  const trDrag = useDragHandlers({
    onGrant: () => grantDrag('tr'),
    onDrag: (dx, dy) => onCropDrag('tr', dx, dy),
    onEnd: endDrag,
  });
  const blDrag = useDragHandlers({
    onGrant: () => grantDrag('bl'),
    onDrag: (dx, dy) => onCropDrag('bl', dx, dy),
    onEnd: endDrag,
  });
  const brDrag = useDragHandlers({
    onGrant: () => grantDrag('br'),
    onDrag: (dx, dy) => onCropDrag('br', dx, dy),
    onEnd: endDrag,
  });
  const tDrag = useDragHandlers({
    onGrant: () => grantDrag('t'),
    onDrag: (dx, dy) => onCropDrag('t', dx, dy),
    onEnd: endDrag,
  });
  const bDrag = useDragHandlers({
    onGrant: () => grantDrag('b'),
    onDrag: (dx, dy) => onCropDrag('b', dx, dy),
    onEnd: endDrag,
  });
  const lDrag = useDragHandlers({
    onGrant: () => grantDrag('l'),
    onDrag: (dx, dy) => onCropDrag('l', dx, dy),
    onEnd: endDrag,
  });
  const rDrag = useDragHandlers({
    onGrant: () => grantDrag('r'),
    onDrag: (dx, dy) => onCropDrag('r', dx, dy),
    onEnd: endDrag,
  });
  const imageDrag = useDragHandlers({
    onGrant: () => grantDrag('image'),
    onDrag: (dx, dy) => onCropDrag('image', dx, dy),
    onEnd: endDrag,
  });

  const wrapHandle = (handle: HandleId, drag: ReturnType<typeof useDragHandlers>, style: object) => {
    const base = { style: [style, drag.webStyle], ...drag.panHandlers };
    if (Platform.OS !== 'web' || !drag.onWebMouseDown) return base;
    return {
      ...base,
      onMouseDown: (e: { preventDefault: () => void; pageX: number; pageY: number }) => {
        e.preventDefault();
        grantDrag(handle);
        drag.onWebMouseDown?.(e.pageX, e.pageY);
      },
    };
  };

  useEffect(() => {
    didInitRef.current = false;
    appliedSeedRef.current = false;
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
      !appliedSeedRef.current &&
      selectionMatchesLayout(seedSelection, imageSize.w, imageSize.h, layout.w, layout.h)
    ) {
      appliedSeedRef.current = true;
      didInitRef.current = true;
      applySelection(seedSelection);
      onSeedApplied?.();
      return;
    }

    if (!didInitRef.current) {
      didInitRef.current = true;
      applySelection(initialCropSelection(imageSize.w, imageSize.h, layout.w, layout.h));
    }
  }, [applySelection, imageSize.h, imageSize.w, layout.h, layout.w, onSeedApplied, seedSelection]);

  const imageRect = useMemo(() => {
    if (!selection) return null;
    return imageDisplayRect(selection);
  }, [selection]);

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
        <View
          {...wrapHandle('image', imageDrag, [
            styles.imageTouch,
            {
              left: imageRect.left,
              top: imageRect.top,
              width: imageRect.width,
              height: imageRect.height,
            },
          ])}
        >
          <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
        </View>
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
            {...wrapHandle('move', moveDrag, [
              styles.frame,
              { left: crop.left, top: crop.top, width: crop.width, height: crop.height },
            ])}
          />
          <CropGrid crop={crop} />

          <View
            {...wrapHandle('t', tDrag, [
              styles.edgeHandle,
              {
                left: crop.left + crop.width / 2 - 24,
                top: crop.top - EDGE_HIT / 2,
                width: 48,
                height: EDGE_HIT,
              },
            ])}
          />
          <View
            {...wrapHandle('b', bDrag, [
              styles.edgeHandle,
              {
                left: crop.left + crop.width / 2 - 24,
                top: crop.top + crop.height - EDGE_HIT / 2,
                width: 48,
                height: EDGE_HIT,
              },
            ])}
          />
          <View
            {...wrapHandle('l', lDrag, [
              styles.edgeHandle,
              {
                left: crop.left - EDGE_HIT / 2,
                top: crop.top + crop.height / 2 - 24,
                width: EDGE_HIT,
                height: 48,
              },
            ])}
          />
          <View
            {...wrapHandle('r', rDrag, [
              styles.edgeHandle,
              {
                left: crop.left + crop.width - EDGE_HIT / 2,
                top: crop.top + crop.height / 2 - 24,
                width: EDGE_HIT,
                height: 48,
              },
            ])}
          />

          <View
            {...wrapHandle('tl', tlDrag, [
              styles.cornerHandle,
              { left: crop.left - half, top: crop.top - half },
            ])}
          />
          <View
            {...wrapHandle('tr', trDrag, [
              styles.cornerHandle,
              { left: crop.left + crop.width - half, top: crop.top - half },
            ])}
          />
          <View
            {...wrapHandle('bl', blDrag, [
              styles.cornerHandle,
              { left: crop.left - half, top: crop.top + crop.height - half },
            ])}
          />
          <View
            {...wrapHandle('br', brDrag, [
              styles.cornerHandle,
              { left: crop.left + crop.width - half, top: crop.top + crop.height - half },
            ])}
          />
        </>
      ) : null}

      <Text style={styles.hint} pointerEvents="none">
        {t('capture.cropDragRegionHint')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.blackPure, overflow: 'hidden' },
  imageTouch: { position: 'absolute', zIndex: 1 },
  dim: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2 },
  frame: { position: 'absolute', borderWidth: 2, borderColor: theme.white, zIndex: 3 },
  gridWrap: { position: 'absolute', zIndex: 3 },
  gridLine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.35)' },
  cornerHandle: {
    position: 'absolute',
    width: HANDLE_HIT,
    height: HANDLE_HIT,
    borderRadius: HANDLE_HIT / 2,
    backgroundColor: theme.white,
    borderWidth: 2,
    borderColor: theme.orange,
    zIndex: 6,
  },
  edgeHandle: {
    position: 'absolute',
    zIndex: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
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
    zIndex: 2,
  },
});
