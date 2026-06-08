import { createElement } from 'react';
import { StyleSheet, View, type ImageProps, type ImageStyle, type StyleProp } from 'react-native';

/** iOS 15 Safari — RN Web Image often fails on blob:/data: URIs; use <img> instead. */
export function needsWebNativeImage(uri: string): boolean {
  return uri.startsWith('blob:') || uri.startsWith('data:');
}

export function webImageStyle(
  style: StyleProp<ImageStyle>,
  resizeMode: NonNullable<ImageProps['resizeMode']> = 'cover'
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

type WebNativeImageProps = {
  uri: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: ImageProps['resizeMode'];
  alt?: string;
};

export function WebNativeImage({
  uri,
  style,
  resizeMode = 'cover',
  alt = '',
}: WebNativeImageProps) {
  return (
    <View style={[styles.clip, style]}>
      {createElement('img', {
        src: uri,
        alt,
        style: webImageStyle(style, resizeMode ?? 'cover'),
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
    width: '100%',
    height: '100%',
  },
});
