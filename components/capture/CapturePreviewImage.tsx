import { createElement, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

function useCapturePreviewUri(uri: string | null | undefined): {
  displayUri: string | null;
  loading: boolean;
  failed: boolean;
} {
  const [displayUri, setDisplayUri] = useState<string | null>(() =>
    uri && isDirectImageUri(uri) ? uri : null
  );
  const [loading, setLoading] = useState(Boolean(uri && !isDirectImageUri(uri)));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!uri) {
      setDisplayUri(null);
      setLoading(false);
      setFailed(false);
      return;
    }
    if (isDirectImageUri(uri)) {
      setDisplayUri(uri);
      setLoading(false);
      setFailed(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFailed(false);
    resolveImageUri(uri)
      .then((next) => {
        if (cancelled) return;
        const resolved = next ?? (isDirectImageUri(uri) ? uri : null);
        setDisplayUri(resolved);
        setLoading(!resolved);
        setFailed(!resolved);
      })
      .catch(() => {
        if (cancelled) return;
        setDisplayUri(uri);
        setLoading(false);
        setFailed(false);
      });

    return () => {
      cancelled = true;
    };
  }, [uri]);

  return { displayUri, loading, failed };
}

/** Capture sheet previews — resolves URI then shows image (spinner while loading). */
export function CapturePreviewImage({ uri, style, resizeMode = 'cover', ...rest }: Props) {
  const { displayUri, loading, failed } = useCapturePreviewUri(uri);

  if (!uri || failed) {
    return <View style={[styles.placeholder, style]} />;
  }

  if (loading || !displayUri) {
    return (
      <View style={[styles.placeholder, styles.centered, style]}>
        <ActivityIndicator color={theme.orange} />
      </View>
    );
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
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clip: {
    overflow: 'hidden',
  },
});
