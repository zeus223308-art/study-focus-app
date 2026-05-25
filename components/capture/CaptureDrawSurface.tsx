import { useEffect, useMemo, useState } from 'react';
import { Image, LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { AnnotationCanvas } from '@/components/annotation/AnnotationCanvas';
import { captureDisplayRect } from '@/lib/files/bake-capture-ink';
import { imageContainRect, initialCropSelection, type CropSelection } from '@/lib/files/interactive-crop';
import type { InkStroke, InkToolId, NoteLayer } from '@/lib/domain/types';

type Props = {
  uri: string;
  tool: InkToolId;
  strokeWidth: number;
  strokes: InkStroke[];
  onStrokesChange: (strokes: InkStroke[]) => void;
  selection: CropSelection | null;
  onSelectionChange?: (selection: CropSelection | null) => void;
};

function buildLayer(strokes: InkStroke[]): NoteLayer {
  const now = new Date().toISOString();
  return {
    id: 'capture_edit',
    studyDate: now.slice(0, 10),
    visible: true,
    strokes,
    scratchpadOffsetY: 0,
    scratchpadHeight: 0,
    note: '',
    createdAt: now,
    updatedAt: now,
  };
}

export function CaptureDrawSurface({
  uri,
  tool,
  strokeWidth,
  strokes,
  onStrokesChange,
  selection,
  onSelectionChange,
}: Props) {
  const [layout, setLayout] = useState({ w: 0, h: 0 });
  const [imageSize, setImageSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    Image.getSize(
      uri,
      (w, h) => setImageSize({ w, h }),
      () => setImageSize({ w: 0, h: 0 })
    );
  }, [uri]);

  useEffect(() => {
    if (imageSize.w < 2 || imageSize.h < 2 || layout.w < 8 || layout.h < 8) return;
    onSelectionChange?.(initialCropSelection(imageSize.w, imageSize.h, layout.w, layout.h));
  }, [imageSize.h, imageSize.w, layout.h, layout.w, onSelectionChange]);

  const imageRect = useMemo(() => {
    if (!selection) return null;
    return imageContainRect(
      selection.imageWidth,
      selection.imageHeight,
      selection.viewportWidth,
      selection.viewportHeight
    );
  }, [selection]);

  const displayRect = useMemo(() => {
    if (!selection) return null;
    return captureDisplayRect(selection);
  }, [selection]);

  const layer = useMemo(() => buildLayer(strokes), [strokes]);

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
      {displayRect && displayRect.width > 0 && displayRect.height > 0 ? (
        <AnnotationCanvas
          layer={layer}
          tool={tool}
          strokeWidth={strokeWidth}
          visible
          onStrokesChange={onStrokesChange}
          height={displayRect.height}
          style={{
            position: 'absolute',
            left: displayRect.left,
            top: displayRect.top,
            width: displayRect.width,
            height: displayRect.height,
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
});
