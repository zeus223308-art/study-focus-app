import { useEffect, useState, type ReactNode } from 'react';
import {
  Platform,
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
import { loadImageDimensions } from '@/lib/files/image-dimensions';
import { resolveFirstReadableUri } from '@/lib/files/resolve-image-uri';

type OverlayLayout = { width: number; height: number; offsetY: number };

type Props = {
  asset?: CloudAsset | null;
  uri?: string | null;
  containerW: number;
  containerH: number;
  preferPreview?: boolean;
  overlay?: (layout: OverlayLayout) => ReactNode;
};

function pickDisplayUri(
  uriProp: string | null | undefined,
  asset: CloudAsset | null | undefined,
  preferPreview: boolean
): string | null {
  if (uriProp) return uriProp;
  if (!asset) return null;
  return preferPreview
    ? getPreviewImageUri(asset) ?? getFullImageUri(asset)
    : getFullImageUri(asset) ?? getPreviewImageUri(asset);
}

/** Master/full URI for aspect — preview thumbs can differ in edge cases. */
function pickDimensionUri(
  uriProp: string | null | undefined,
  asset: CloudAsset | null | undefined
): string | null {
  if (asset) return getFullImageUri(asset) ?? getPreviewImageUri(asset) ?? uriProp ?? null;
  return uriProp ?? null;
}

export function useWidthFitImageLayout(
  uri: string | null | undefined,
  containerW: number,
  containerH: number
): {
  imgW: number;
  imgH: number;
  offsetY: number;
  scrolls: boolean;
  ready: boolean;
} {
  const [aspect, setAspect] = useState<number | null>(null);

  useEffect(() => {
    if (!uri) {
      setAspect(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const readable = (await resolveFirstReadableUri([uri])) ?? uri;
        const { width, height } = await loadImageDimensions(readable);
        if (!cancelled && width > 0) setAspect(height / width);
      } catch {
        if (!cancelled) setAspect(4 / 3);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uri]);

  const imgW = Math.max(1, containerW);
  const ratio = aspect ?? 4 / 3;
  const imgH = Math.max(1, Math.round(containerW * ratio));
  const scrolls = imgH > containerH + 1;
  const offsetY = !scrolls && imgH < containerH ? Math.round((containerH - imgH) / 2) : 0;
  return { imgW, imgH, offsetY, scrolls, ready: aspect !== null };
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
  const displayUri = pickDisplayUri(uriProp, asset, preferPreview);
  const dimensionUri = pickDimensionUri(uriProp, asset);
  const { imgW, imgH, offsetY, scrolls, ready } = useWidthFitImageLayout(
    dimensionUri,
    containerW,
    containerH
  );

  if (containerW < 1 || containerH < 1 || !displayUri) {
    return <View style={{ width: containerW, height: containerH }} />;
  }

  const imageStyle = { width: imgW, height: imgH } as const;

  const imageContent = (
    <View style={[imageStyle, styles.imageWrap]}>
      {ready ? (
        <ResolvedImage
          uri={displayUri}
          asset={asset ?? undefined}
          preferPreview={preferPreview}
          style={imageStyle}
          resizeMode="contain"
        />
      ) : (
        <View style={[imageStyle, styles.placeholder]} />
      )}
      {ready && overlay ? overlay({ width: imgW, height: imgH, offsetY: 0 }) : null}
    </View>
  );

  if (scrolls) {
    return (
      <ScrollView
        style={[styles.scroll, { width: containerW, height: containerH }]}
        contentContainerStyle={{ width: containerW, minHeight: imgH }}
        showsVerticalScrollIndicator={Platform.OS !== 'web'}
        nestedScrollEnabled
        bounces={false}>
        {imageContent}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.frame, { width: containerW, height: containerH }]}>
      <View style={{ marginTop: offsetY, width: imgW }}>{imageContent}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    backgroundColor: theme.surface,
  },
  imageWrap: {
    position: 'relative',
  },
  placeholder: {
    backgroundColor: theme.grayLight,
  },
  scroll: {
    backgroundColor: theme.surface,
    ...(Platform.OS === 'web'
      ? ({ overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' } as object)
      : null),
  },
  box: {
    width: '100%',
    overflow: 'hidden',
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
      style={[styles.box, style]}
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
