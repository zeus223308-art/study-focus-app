import { useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { AnnotationCanvas } from '@/components/annotation/AnnotationCanvas';
import { MemoTextBoxView } from '@/components/annotation/MemoTextBox';
import {
  mergedPhotoInkLayer,
  normalizePhotoMemo,
} from '@/lib/domain/photo-memo';
import type { InkToolId, NoteLayer, PhotoMemo } from '@/lib/domain/types';

type Props = {
  memo?: PhotoMemo | null;
  legacyLayer?: NoteLayer | null;
  surfaceWidth: number;
  surfaceHeight: number;
  inkInteractive?: boolean;
  textInteractive?: boolean;
  tool?: InkToolId;
  strokeWidth?: number;
  onStrokesChange?: (strokes: NoteLayer['strokes']) => void;
  style?: ViewStyle;
  textPlaceholder?: string;
};

export function PhotoInkOverlay({
  memo: memoProp,
  legacyLayer,
  surfaceWidth,
  surfaceHeight,
  inkInteractive = false,
  textInteractive = false,
  tool = 'pen-black',
  strokeWidth = 3,
  onStrokesChange,
  style,
  textPlaceholder = '',
}: Props) {
  const memo = normalizePhotoMemo(memoProp);
  const layer = useMemo(
    () => mergedPhotoInkLayer(memo, legacyLayer),
    [memo, legacyLayer]
  );
  const hasInk = layer.strokes.length > 0;
  const hasText = memo.textBoxes.length > 0;
  const showInk = hasInk || inkInteractive;

  if (!showInk && !hasText) return null;

  const passthrough = !inkInteractive && !textInteractive;

  return (
    <View
      style={[styles.root, passthrough && styles.passthrough, style]}
      pointerEvents={passthrough ? 'none' : 'box-none'}>
      {showInk ? (
        <AnnotationCanvas
          layer={layer}
          tool={tool}
          strokeWidth={strokeWidth}
          visible
          interactive={Boolean(inkInteractive && onStrokesChange)}
          onStrokesChange={onStrokesChange ?? (() => {})}
          height={surfaceHeight}
          style={[styles.ink, !inkInteractive && styles.inkPassthrough]}
        />
      ) : null}
      {memo.textBoxes.map((box) => (
        <MemoTextBoxView
          key={box.id}
          box={box}
          active={false}
          editing={false}
          interactive={textInteractive}
          surfaceWidth={surfaceWidth}
          surfaceHeight={surfaceHeight}
          placeholder={textPlaceholder}
          onChange={() => {}}
          onSelect={() => {}}
          onEdit={() => {}}
          onRemove={() => {}}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  passthrough: { pointerEvents: 'none' as const },
  ink: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  inkPassthrough: { pointerEvents: 'none' as const },
});
