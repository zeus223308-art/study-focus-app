import { Image, StyleSheet, View } from 'react-native';

import { useApp } from '@/context/AppContext';
import { theme } from '@/constants/theme';

type Props = {
  pageX: number;
  pageY: number;
  visible: boolean;
};

export function DragMoveGhost({ pageX, pageY, visible }: Props) {
  const { movingBundleId, data } = useApp();
  if (!visible || !movingBundleId) return null;

  const bundle = data.bundles.find((b) => b.id === movingBundleId);
  const uri = bundle?.pages[0]?.asset.thumbnailUri;
  if (!uri) return null;

  const size = 64;
  const left = pageX - size / 2;
  const top = pageY - size / 2;

  return (
    <View style={[styles.ghost, { left, top }]} pointerEvents="none">
      <Image source={{ uri }} style={styles.thumb} />
    </View>
  );
}

const styles = StyleSheet.create({
  ghost: {
    position: 'absolute',
    zIndex: 200,
    width: 64,
    height: 80,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.orange,
    opacity: 0.92,
    ...theme.cardShadow,
  },
  thumb: { width: '100%', height: '100%' },
});
