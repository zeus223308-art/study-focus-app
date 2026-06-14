import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';

import { ResolvedImage } from '@/components/ui/ResolvedImage';
import { theme } from '@/constants/theme';
import type { CloudAsset } from '@/lib/domain/types';

const COVER = 52;

type Props = {
  bundleId: string;
  pageId: string;
  asset?: CloudAsset | null;
  style?: StyleProp<ImageStyle>;
};

/** Trash row thumbnail — resolves from IndexedDB via bundle/page keys (survives stale blob URIs). */
export function TrashCoverImage({ bundleId, pageId, asset, style }: Props) {
  const retryRef = useRef(0);
  const [reloadKey, setReloadKey] = useState(0);

  const retryLoad = useCallback(() => {
    if (retryRef.current >= 3) return;
    retryRef.current += 1;
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    retryRef.current = 0;
    setReloadKey(0);
  }, [bundleId, pageId, asset]);

  if (!bundleId || !pageId) {
    return <View style={[styles.cover, styles.empty, style]} />;
  }

  return (
    <View style={[styles.cover, styles.frame, style]}>
      <ResolvedImage
        key={`${bundleId}/${pageId}/${reloadKey}`}
        asset={asset}
        bundleId={bundleId}
        pageId={pageId}
        preferPreview
        resizeMode="cover"
        style={styles.image}
        onError={retryLoad}
      />
    </View>
  );
}

export const TRASH_COVER_SIZE = COVER;

const styles = StyleSheet.create({
  cover: {
    width: COVER,
    height: COVER,
    borderRadius: 8,
    flexShrink: 0,
    overflow: 'hidden',
  },
  frame: {
    backgroundColor: theme.grayLight,
    borderWidth: 1,
    borderColor: theme.grayLight,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  empty: {
    backgroundColor: theme.grayLight,
  },
});
