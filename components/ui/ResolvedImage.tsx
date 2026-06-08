import { createElement, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  View,
  type ImageProps,
  type ImageStyle,
  type StyleProp,
} from 'react-native';

import { theme } from '@/constants/theme';
import type { CloudAsset } from '@/lib/domain/types';
import {
  getFullUriCandidates,
  getPreviewUriCandidates,
} from '@/lib/files/asset-uri-utils';
import { isDirectImageUri } from '@/lib/files/direct-image-uri';
import { resolveFirstReadableUri } from '@/lib/files/resolve-image-uri';

type Props = Omit<ImageProps, 'source'> & {
  uri?: string | null | undefined;
  asset?: CloudAsset | null;
  preferPreview?: boolean;
  blurred?: boolean;
  style?: StyleProp<ImageStyle>;
};

function webObjectFit(resizeMode: NonNullable<ImageProps['resizeMode']>): React.CSSProperties['objectFit'] {
  switch (resizeMode) {
    case 'contain':
      return 'contain';
    case 'cover':
      return 'cover';
    case 'stretch':
      return 'fill';
    case 'center':
      return 'none';
    default:
      return 'contain';
  }
}

function webImgStyle(
  style: StyleProp<ImageStyle>,
  resizeMode: NonNullable<ImageProps['resizeMode']>,
  blurred?: boolean
): React.CSSProperties {
  const flat = StyleSheet.flatten(style) ?? {};
  return {
    width: '100%',
    height: '100%',
    objectFit: webObjectFit(resizeMode),
    borderRadius: typeof flat.borderRadius === 'number' ? flat.borderRadius : undefined,
    display: 'block',
    ...(blurred
      ? { filter: 'blur(18px) saturate(1.08)', transform: 'scale(1.08)' }
      : null),
  };
}

export function ResolvedImage({
  uri,
  asset,
  preferPreview = true,
  blurred = false,
  style,
  resizeMode = 'cover',
  ...rest
}: Props) {
  const candidates = useMemo(() => {
    if (asset) {
      return preferPreview ? getPreviewUriCandidates(asset) : getFullUriCandidates(asset);
    }
    return uri ? [uri] : [];
  }, [asset, uri, preferPreview]);

  const [resolved, setResolved] = useState<string | null>(() => {
    const first = candidates[0];
    return first && isDirectImageUri(first) ? first : null;
  });

  useEffect(() => {
    if (candidates.length === 0) {
      setResolved(null);
      return;
    }

    const first = candidates[0];
    if (candidates.length === 1 && first && isDirectImageUri(first)) {
      setResolved(first);
      return;
    }

    let cancelled = false;
    void resolveFirstReadableUri(candidates).then((u) => {
      if (!cancelled) setResolved(u);
    });

    return () => {
      cancelled = true;
    };
  }, [candidates]);

  if (!resolved) {
    return <View style={[styles.placeholder, style]} />;
  }

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.clip, style]}>
        {createElement('img', {
          src: resolved,
          alt: '',
          style: webImgStyle(style, resizeMode, blurred),
        })}
      </View>
    );
  }

  return (
    <Image
      {...rest}
      source={{ uri: resolved }}
      style={style}
      resizeMode={resizeMode}
      blurRadius={blurred ? 16 : 0}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: theme.grayLight,
  },
  clip: {
    overflow: 'hidden',
  },
});
