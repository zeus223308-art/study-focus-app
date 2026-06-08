import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { PhotoInkOverlay } from '@/components/bundle/PhotoInkOverlay';
import { ResolvedImage } from '@/components/ui/ResolvedImage';
import { theme } from '@/constants/theme';
import { BUTTON_LABEL_COMPACT } from '@/lib/ui/button-label';
import { LANDSCAPE_CARD_RATIO } from '@/lib/ui/landscape-card-layout';
import { hasPhotoSideInk } from '@/lib/domain/photo-memo';
import type { CloudAsset, InkToolId, NoteLayer, PhotoMemo } from '@/lib/domain/types';
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
  memo?: PhotoMemo | null;
  legacyLayer?: NoteLayer | null;
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
  memo,
  legacyLayer,
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
  const [measuredW, setMeasuredW] = useState(0);

  const width = measuredW > 0 ? measuredW : maxWidth;
  const inkVisible =
    showInkPreview || hasPhotoSideInk(memo, legacyLayer ?? layer);
  const landscapeH = Math.round(width / LANDSCAPE_CARD_RATIO);
  const height = fillWidth
    ? Math.min(maxHeight, Math.max(72, landscapeH))
    : maxHeight;

  const onWrapLayout = useCallback((w: number) => {
    if (w > 0 && w !== measuredW) setMeasuredW(w);
  }, [measuredW]);

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => onWrapLayout(Math.round(e.nativeEvent.layout.width))}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        onPress={hasImage ? onPress : onAddPress}
        style={[styles.frame, { height }]}
        accessibilityRole="button">
        {hasImage ? (
          <>
            <ResolvedImage
              uri={uri}
              asset={asset}
              style={{ width: '100%', height }}
              resizeMode="contain"
            />
            {inkVisible || (inkEnabled && onStrokesChange) ? (
              <PhotoInkOverlay
                memo={memo}
                legacyLayer={legacyLayer ?? layer}
                surfaceWidth={width}
                surfaceHeight={height}
                inkInteractive={Boolean(inkEnabled && onStrokesChange)}
                tool={tool}
                strokeWidth={strokeWidth}
                onStrokesChange={onStrokesChange}
                style={styles.ink}
              />
            ) : null}
            {showMemoBadge ? (
              <View style={styles.memoBadge} pointerEvents="none">
                <SymbolView
                  name={{ ios: 'note.text', android: 'description', web: 'description' }}
                  size={14}
                  tintColor={theme.orange}
                />
              </View>
            ) : null}
          </>
        ) : (
          <View style={[styles.empty, { height }]}>
            <Text style={styles.emptyText}>{placeholder ?? '+'}</Text>
          </View>
        )}
      </Pressable>
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
  frame: {
    width: '100%',
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.grayLight,
    position: 'relative',
  },
  ink: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  empty: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: theme.orange,
    backgroundColor: theme.orangeSoft,
  },
  emptyText: { color: theme.orange, fontWeight: '800', fontSize: theme.font.caption },
  memoBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: theme.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
