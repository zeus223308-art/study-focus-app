import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { AnnotationCanvas } from '@/components/annotation/AnnotationCanvas';
import { ResolvedImage } from '@/components/ui/ResolvedImage';
import { theme } from '@/constants/theme';
import type { CloudAsset, InkToolId, NoteLayer } from '@/lib/domain/types';
import { getFullImageUri, getPreviewImageUri } from '@/lib/files/display-image-uri';

type Props = {
  label: string;
  asset: CloudAsset | null;
  width: number;
  height: number;
  onPress: () => void;
  inkEnabled?: boolean;
  layer?: NoteLayer | null;
  tool?: InkToolId;
  strokeWidth?: number;
  onStrokesChange?: (strokes: NoteLayer['strokes']) => void;
  placeholder?: string;
  onAddPress?: () => void;
};

export function BundlePhotoBlock({
  label,
  asset,
  width,
  height,
  onPress,
  inkEnabled,
  layer,
  tool = 'pen-black',
  strokeWidth = 3,
  onStrokesChange,
  placeholder,
  onAddPress,
}: Props) {
  const uri = asset ? getPreviewImageUri(asset) ?? getFullImageUri(asset) : null;
  const hasImage = Boolean(uri && asset);

  const onLayout = (_e: LayoutChangeEvent) => {};

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={hasImage ? onPress : onAddPress}
        style={[styles.frame, { width, height }]}
        accessibilityRole="button">
        {hasImage ? (
          <>
            <ResolvedImage
              uri={uri}
              asset={asset}
              style={{ width, height }}
              resizeMode="contain"
            />
            {inkEnabled && layer && onStrokesChange ? (
              <AnnotationCanvas
                layer={layer}
                tool={tool}
                strokeWidth={strokeWidth}
                visible
                onStrokesChange={onStrokesChange}
                height={height}
                style={styles.ink}
              />
            ) : null}
          </>
        ) : (
          <View style={[styles.empty, { width, height }]}>
            <Text style={styles.emptyText}>{placeholder ?? '+'}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: {
    fontSize: theme.font.body,
    fontWeight: '800',
    color: theme.black,
    marginBottom: 8,
  },
  frame: {
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.grayLight,
    position: 'relative',
  },
  ink: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: theme.orange,
    backgroundColor: theme.orangeSoft,
  },
  emptyText: { color: theme.orange, fontWeight: '800', fontSize: theme.font.caption },
});
