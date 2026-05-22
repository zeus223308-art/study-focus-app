import { useEffect, useState } from 'react';
import { Image, StyleSheet, View, type ImageProps, type ImageStyle, type StyleProp } from 'react-native';

import { theme } from '@/constants/theme';
import { resolveImageUri } from '@/lib/files/resolve-image-uri';

type Props = Omit<ImageProps, 'source'> & {
  uri: string | null | undefined;
  style?: StyleProp<ImageStyle>;
};

export function ResolvedImage({ uri, style, ...rest }: Props) {
  const [resolved, setResolved] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setResolved(null);
    resolveImageUri(uri).then((u) => {
      if (!cancelled) setResolved(u);
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
