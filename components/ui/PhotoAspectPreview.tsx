import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { CapturePreviewImage } from '@/components/capture/CapturePreviewImage';
import { ResolvedImage } from '@/components/ui/ResolvedImage';
import { theme } from '@/constants/theme';
import type { CloudAsset } from '@/lib/domain/types';
import { LANDSCAPE_CARD_RATIO } from '@/lib/ui/landscape-card-layout';

export const DEFAULT_PHOTO_PREVIEW_MAX_HEIGHT = 220;

export type PhotoPreviewLayout = { width: number; height: number };

type Props = {
  uri: string | null | undefined;
  asset?: CloudAsset | null;
  maxWidth?: number;
  maxHeight?: number;
  /** Side-by-side slot: cap height using landscape card ratio. */
  fillWidth?: boolean;
  preferPreview?: boolean;
  frameStyle?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onLayoutReady?: (layout: PhotoPreviewLayout) => void;
  overlay?: (layout: PhotoPreviewLayout) => ReactNode;
  empty?: ReactNode;
  showMemoBadge?: boolean;
};

function computePreviewHeight(
  width: number,
  aspect: number,
  maxHeight: number,
  fillWidth: boolean
): number {
  const landscapeH = Math.round(width / LANDSCAPE_CARD_RATIO);
  return fillWidth
    ? Math.min(maxHeight, Math.max(72, landscapeH))
    : Math.min(maxHeight, Math.max(72, Math.round(width * aspect)));
}

export function PhotoAspectPreview({
  uri,
  asset,
  maxWidth = 320,
  maxHeight = DEFAULT_PHOTO_PREVIEW_MAX_HEIGHT,
  fillWidth = false,
  preferPreview = true,
  frameStyle,
  onPress,
  onLayoutReady,
  overlay,
  empty,
  showMemoBadge = false,
}: Props) {
  const hasImage = Boolean(uri || asset);
  const [aspect, setAspect] = useState(4 / 3);
  const [measuredW, setMeasuredW] = useState(0);

  useEffect(() => {
    if (!uri) return;
    Image.getSize(
      uri,
      (w, h) => {
        if (w > 0) setAspect(h / w);
      },
      () => setAspect(4 / 3)
    );
  }, [uri]);

  const width = measuredW > 0 ? measuredW : maxWidth;
  const height = computePreviewHeight(width, aspect, maxHeight, fillWidth);

  useEffect(() => {
    if (width > 0 && height > 0) {
      onLayoutReady?.({ width, height });
    }
  }, [width, height, onLayoutReady]);

  const onWrapLayout = useCallback((w: number) => {
    if (w > 0) setMeasuredW((prev) => (prev !== w ? w : prev));
  }, []);

  const frame = (
    <View style={[styles.frame, { height }, frameStyle]}>
      {hasImage ? (
        <>
          {asset ? (
            <ResolvedImage
              uri={uri}
              asset={asset}
              preferPreview={preferPreview}
              style={{ width: '100%', height }}
              resizeMode="contain"
            />
          ) : (
            <CapturePreviewImage
              uri={uri}
              style={{ width: '100%', height }}
              resizeMode="contain"
            />
          )}
          {overlay?.({ width, height })}
          {showMemoBadge ? (
            <View style={styles.memoBadge} pointerEvents="none">
              <SymbolView
                name={{ ios: 'note.text', android: 'description', web: 'description' }}
                size={14}
                tintColor={theme.orange}
              />
            </View>
          ) : null}
        </>
      ) : (
        empty ?? (
          <View style={[styles.empty, { height }]}>
            <View style={styles.emptyInner} />
          </View>
        )
      )}
    </View>
  );

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => onWrapLayout(Math.round(e.nativeEvent.layout.width))}>
      {onPress ? (
        <Pressable onPress={onPress} accessibilityRole="button">
          {frame}
        </Pressable>
      ) : (
        frame
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', alignSelf: 'stretch' },
  frame: {
    width: '100%',
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.grayLight,
    position: 'relative',
  },
  empty: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: theme.orange,
    backgroundColor: theme.orangeSoft,
  },
  emptyInner: { minHeight: 72 },
  memoBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: theme.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
