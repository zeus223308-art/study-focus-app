import { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, View, type ImageProps, type ImageStyle, type StyleProp } from 'react-native';

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
  style?: StyleProp<ImageStyle>;
};

export function ResolvedImage({ uri, asset, preferPreview = true, style, ...rest }: Props) {
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

  return <Image {...rest} source={{ uri: resolved }} style={style} />;
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: theme.grayLight,
  },
});
