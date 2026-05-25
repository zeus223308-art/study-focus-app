import { createElement, useEffect, useState } from 'react';
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
import { isDirectImageUri } from '@/lib/files/direct-image-uri';
import { resolveImageUri } from '@/lib/files/resolve-image-uri';

type Props = Omit<ImageProps, 'source'> & {
  uri: string | null | undefined;
  style?: StyleProp<ImageStyle>;
};

function webImgStyle(
  style: StyleProp<ImageStyle>,
  resizeMode: NonNullable<ImageProps['resizeMode']>
): React.CSSProperties {
  const flat = StyleSheet.flatten(style) ?? {};
  return {
    width: '100%',
    height: '100%',
    objectFit: resizeMode === 'contain' ? 'contain' : 'cover',
    borderRadius: typeof flat.borderRadius === 'number' ? flat.borderRadius : undefined,
    display: 'block',
  };
}

function useCapturePreviewUri(uri: string | null | undefined): string | null {
  const [resolved, setResolved] = useState<string | null>(() =>
    isDirectImageUri(uri) ? uri : null
  );

  useEffect(() => {
    if (!uri) {
      setResolved(null);
      return;
    }
    if (isDirectImageUri(uri)) {
      setResolved(uri);
      return;
    }

    let cancelled = false;
    resolveImageUri(uri)
      .then((next) => {
        if (!cancelled) setResolved(next ?? uri);
      })
      .catch(() => {
        if (!cancelled) setResolved(uri);
      });

    return () => {
      cancelled = true;
    };
  }, [uri]);

  return resolved;
}

/** Capture sheet previews — same direct rendering as the photo editor. */
export function CapturePreviewImage({ uri, style, resizeMode = 'cover', ...rest }: Props) {
  const displayUri = useCapturePreviewUri(uri);

  if (!displayUri) {
    return <View style={[styles.placeholder, style]} />;
  }

  if (
    Platform.OS === 'web' &&
    (displayUri.startsWith('blob:') || displayUri.startsWith('data:'))
  ) {
    return (
      <View style={[styles.clip, style]}>
        {createElement('img', {
          src: displayUri,
          alt: '',
          style: webImgStyle(style, resizeMode),
        })}
      </View>
    );
  }

  return <Image {...rest} source={{ uri: displayUri }} style={style} resizeMode={resizeMode} />;
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: theme.grayLight,
  },
  clip: {
    overflow: 'hidden',
  },
});
