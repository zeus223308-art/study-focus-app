import { Image, StyleSheet, Text, View } from 'react-native';

import { useApp } from '@/context/AppContext';
import { theme } from '@/constants/theme';

type Props = {
  pageX: number;
  pageY: number;
  visible: boolean;
};

/** Web: fixed positioning tracks viewport coords from touch events. */
export function DragMoveGhost({ pageX, pageY, visible }: Props) {
  const { movingBundleId, draggingItemKey, reorderingSubjectId, data } = useApp();
  if (!visible) return null;

  if (reorderingSubjectId) {
    const subject = data.subjects.find((s) => s.id === reorderingSubjectId);
    if (!subject) return null;
    const left = pageX - 56;
    const top = pageY - 28;
    return (
      <View style={[styles.labelGhost, { left, top }]} pointerEvents="none">
        <Text style={styles.labelText} numberOfLines={1}>
          {subject.name}
        </Text>
      </View>
    );
  }

  if (!movingBundleId) return null;

  const bundle = data.bundles.find((b) => b.id === movingBundleId);
  if (!bundle) return null;

  const page =
    draggingItemKey != null
      ? bundle.pages.find((p) => `${bundle.id}:${p.id}` === draggingItemKey)
      : bundle.pages[0];
  const uri = page?.asset.thumbnailUri ?? bundle.pages[0]?.asset.thumbnailUri;
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

const fixed = {
  position: 'fixed' as const,
  zIndex: 2147483645,
};

const styles = StyleSheet.create({
  ghost: {
    ...fixed,
    width: 64,
    height: 80,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.orange,
    opacity: 0.92,
  },
  thumb: { width: '100%', height: '100%' },
  labelGhost: {
    ...fixed,
    minWidth: 112,
    maxWidth: 180,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: theme.orange,
    backgroundColor: theme.surface,
    opacity: 0.95,
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
  } as object,
  labelText: {
    fontSize: theme.font.body,
    fontWeight: '800',
    color: theme.black,
    textAlign: 'center',
  },
});
