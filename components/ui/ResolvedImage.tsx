import { useEffect, useState } from 'react';
import { Image, StyleSheet, View, type ImageProps, type ImageStyle, type StyleProp } from 'react-native';

import { theme } from '@/constants/theme';
import { isDirectImageUri } from '@/lib/files/direct-image-uri';
import { resolveImageUri } from '@/lib/files/resolve-image-uri';

type Props = Omit<ImageProps, 'source'> & {
  uri: string | null | undefined;
  style?: StyleProp<ImageStyle>;
};

export function ResolvedImage({ uri, style, ...rest }: Props) {
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
      .then((u) => {
        if (!cancelled) setResolved(u ?? uri ?? null);
      })
      .catch(() => {
        if (!cancelled) setResolved(uri ?? null);
      });

    return () => {
      cancelled = true;
    };
  }, [uri]);

  if (!resolved) {
    return <View style={[styles.placeholder, style]} />;
  }

  return <Image {...rest} source={{ uri: resolved }} style={style} />;
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: theme.grayLight,
  },
});
