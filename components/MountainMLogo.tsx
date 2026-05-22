import { Image, StyleSheet, View } from 'react-native';

/** 스플래시 — 블랙 앤 화이트 */
export const SPLASH_BLACK = '#000000';
export const LOGO_WHITE = '#FFFFFF';

const LOGO_SOURCE = require('@/assets/images/mountain-m-logo.png');

type Props = {
  width?: number;
  height?: number;
};

export function MountainMLogo({ width = 220, height = 154 }: Props) {
  return (
    <View style={[styles.wrap, { width, height }]}>
      <Image source={LOGO_SOURCE} style={styles.img} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  img: { width: '100%', height: '100%' },
});
