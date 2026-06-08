import { useEffect, useState, type ReactNode } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ResolvedImage } from '@/components/ui/ResolvedImage';
import { theme } from '@/constants/theme';
import type { CloudAsset } from '@/lib/domain/types';
import { getFullImageUri, getPreviewImageUri } from '@/lib/files/display-image-uri';

type OverlayLayout = { width: number; height: number; offsetY: number };

type Props = {
  asset?: CloudAsset | null;
  uri?: string | null;
  containerW: number;
  containerH: number;
  preferPreview?: boolean;
  overlay?: (layout: OverlayLayout) => ReactNode;
};

export function useWidthFitImageLayout(
  uri: string | null | undefined,
  containerW: number,
  containerH: number
): { imgW: number; imgH: number; offsetY: number; scrolls: boolean } {
  const [aspect, setAspect] = useState(4 / 3);

  useEffect(() => {
    if (!uri) return;
    let cancelled = false;
    Image.getSize(
      uri,
      (w, h) => {
        if (!cancelled && w > 0) setAspect(h / w);
      },
      () => {
        if (!cancelled) setAspect(4 / 3);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [uri]);

  const imgW = Math.max(1, containerW);
  const imgH = Math.max(1, Math.round(containerW * aspect));
  const offsetY = imgH < containerH ? Math.round((containerH - imgH) / 2) : 0;
  const scrolls = imgH > containerH + 1;
  return { imgW, imgH, offsetY, scrolls };
}

/** Full image visible, scaled to fill container width; vertical scroll if taller than viewport. */
export function WidthFitPreviewImage({
  asset,
  uri: uriProp,
  containerW,
  containerH,
  preferPreview = false,
  overlay,
}: Props) {
  const resolvedUri =
    uriProp ??
    (asset
      ? preferPreview
        ? getPreviewImageUri(asset) ?? getFullImageUri(asset)
        : getFullImageUri(asset) ?? getPreviewImageUri(asset)
      : null);

  const { imgW, imgH, offsetY, scrolls } = useWidthFitImageLayout(
    resolvedUri,
    containerW,
    containerH
  );

  if (containerW < 1 || containerH < 1 || !resolvedUri) {
    return <View style={{ width: containerW, height: containerH }} />;
  }

  const imageContent = (
    <View style={{ width: imgW, height: imgH, position: 'relative' }}>
      <ResolvedImage
        uri={resolvedUri}
        asset={asset ?? undefined}
        preferPreview={preferPreview}
        style={{ width: imgW, height: imgH }}
        resizeMode="contain"
      />
      {overlay ? overlay({ width: imgW, height: imgH, offsetY: 0 }) : null}
    </View>
  );

  if (scrolls) {
    return (
      <ScrollView
        style={{ width: containerW, height: containerH }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}>
        {imageContent}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.frame, { width: containerW, height: containerH }]}>
      <View style={{ marginTop: offsetY }}>{imageContent}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    backgroundColor: theme.surface,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

type BoxProps = {
  asset?: CloudAsset | null;
  uri?: string | null;
  style?: StyleProp<ViewStyle>;
  preferPreview?: boolean;
  overlay?: (layout: OverlayLayout) => ReactNode;
};

/** Measures its layout box and renders a width-fit preview inside (cards, capture sheet). */
export function WidthFitPreviewBox({
  asset,
  uri,
  style,
  preferPreview = false,
  overlay,
}: BoxProps) {
  const [size, setSize] = useState({ w: 0, h: 0 });

  return (
    <View
      style={style}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width > 0 && height > 0) {
          setSize({ w: Math.round(width), h: Math.round(height) });
        }
      }}>
      {size.w > 0 && size.h > 0 ? (
        <WidthFitPreviewImage
          asset={asset}
          uri={uri}
          containerW={size.w}
          containerH={size.h}
          preferPreview={preferPreview}
          overlay={overlay}
        />
      ) : null}
    </View>
  );
}
