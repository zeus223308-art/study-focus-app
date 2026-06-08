import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { AnnotationCanvas } from '@/components/annotation/AnnotationCanvas';
import { PhotoAspectPreview } from '@/components/ui/PhotoAspectPreview';
import { theme } from '@/constants/theme';
import { BUTTON_LABEL_COMPACT } from '@/lib/ui/button-label';
import type { CloudAsset, InkToolId, NoteLayer } from '@/lib/domain/types';
import { getFullImageUri, getPreviewImageUri } from '@/lib/files/display-image-uri';
type Props = {
  label?: string;
  maxWidth: number;
  maxHeight?: number;
  fillWidth?: boolean;
  asset: CloudAsset | null;
  onPress: () => void;
  showInkPreview?: boolean;
  inkEnabled?: boolean;
  layer?: NoteLayer | null;
  tool?: InkToolId;
  strokeWidth?: number;
  onStrokesChange?: (strokes: NoteLayer['strokes']) => void;
  placeholder?: string;
  onAddPress?: () => void;
  showMemoBadge?: boolean;
  onMemoPress?: () => void;
  memoButtonLabel?: string;
};

export function BundlePhotoBlock({
  label,
  maxWidth,
  maxHeight = 220,
  fillWidth = false,
  asset,
  onPress,
  showInkPreview = false,
  inkEnabled,
  layer,
  tool = 'pen-black',
  strokeWidth = 3,
  onStrokesChange,
  placeholder,
  onAddPress,
  showMemoBadge = false,
  onMemoPress,
  memoButtonLabel,
}: Props) {
  const uri = asset ? getPreviewImageUri(asset) ?? getFullImageUri(asset) : null;
  const hasImage = Boolean(uri && asset);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <PhotoAspectPreview
        uri={uri}
        asset={asset}
        maxWidth={maxWidth}
        maxHeight={maxHeight}
        fillWidth={fillWidth}
        onPress={hasImage ? onPress : onAddPress}
        showMemoBadge={showMemoBadge}
        empty={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{placeholder ?? '+'}</Text>
          </View>
        }
        overlay={(layout) =>
          layer && (showInkPreview || (inkEnabled && onStrokesChange)) ? (
            <AnnotationCanvas
              layer={layer}
              tool={tool}
              strokeWidth={strokeWidth}
              visible
              interactive={Boolean(inkEnabled && onStrokesChange)}
              onStrokesChange={onStrokesChange ?? (() => {})}
              height={layout.height}
              style={styles.ink}
            />
          ) : null
        }
      />
      {hasImage && onMemoPress ? (
        <Pressable
          onPress={onMemoPress}
          style={styles.memoBtn}
          accessibilityRole="button"
          accessibilityLabel={memoButtonLabel ?? 'Memo'}>
          <SymbolView
            name={{ ios: 'note.text', android: 'description', web: 'description' }}
            size={16}
            tintColor={theme.orange}
          />
          <Text style={styles.memoBtnText}>{memoButtonLabel ?? '+ 메모 추가'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', marginBottom: 16, alignSelf: 'stretch' },
  label: {
    fontSize: theme.font.body,
    fontWeight: '800',
    color: theme.black,
    marginBottom: 8,
  },
  ink: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  empty: {
    flex: 1,
    width: '100%',
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { color: theme.orange, fontWeight: '800', fontSize: theme.font.caption },
  memoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.orange,
    backgroundColor: theme.orangeSoft,
  },
  memoBtnText: {
    ...BUTTON_LABEL_COMPACT,
    color: theme.orange,
    fontWeight: '800',
  },
});
