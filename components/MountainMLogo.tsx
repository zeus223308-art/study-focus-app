import Svg, { Path } from 'react-native-svg';

export const SPLASH_BLACK = '#000000';
export const LOGO_WHITE = '#FFFFFF';
export const LOGO_GRAY = '#6B6B6B';
export const LOGO_GRAY_DARK = '#3A3A3A';
export const LOGO_GRAY_LIGHT = '#B5B5B5';

type Props = {
  width?: number;
  height?: number;
};

/** 산 M — 검정 배경 위 검정·화이트·회색 혼합 */
export function MountainMLogo({ width = 240, height = 168 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 200 140">
      {/* 본체 (짙은 회색) */}
      <Path
        fill={LOGO_GRAY_DARK}
        d="
          M 26 134 L 54 134 L 56 112 L 58 94 L 56 80 L 60 66 L 58 54 L 62 44
          L 59 38 L 63 30 L 60 24 L 64 16 L 61 10 L 66 6 L 63 12 L 68 22 L 70 34
          L 74 48 L 80 64 L 92 80 L 100 94 L 108 80 L 120 64 L 126 48 L 130 34
          L 132 22 L 137 12 L 134 6 L 139 10 L 136 16 L 140 24 L 137 30 L 141 38
          L 138 44 L 142 54 L 140 66 L 144 80 L 142 94 L 144 112 L 146 134
          L 174 134 L 174 138 L 26 138 Z
        "
      />
      {/* 중간 톤 슬로프 */}
      <Path
        fill={LOGO_GRAY}
        d="
          M 58 134 L 72 134 L 74 108 L 78 88 L 76 72 L 82 58 L 88 72 L 100 88
          L 112 72 L 118 58 L 124 72 L 122 88 L 126 108 L 128 134 L 142 134
          L 140 110 L 136 90 L 132 70 L 128 50 L 124 38 L 118 28 L 112 38 L 108 50
          L 100 68 L 92 50 L 86 38 L 80 28 L 74 38 L 70 50 L 66 70 L 62 90 L 58 110 Z
        "
      />
      {/* 흰 봉우리 · 능선 */}
      <Path
        fill={LOGO_WHITE}
        d="M 59 38 L 63 30 L 60 24 L 64 16 L 61 10 L 66 6 L 63 12 L 68 22 L 70 34 L 74 48 L 80 58 Z"
      />
      <Path
        fill={LOGO_WHITE}
        d="M 136 16 L 139 10 L 134 6 L 137 12 L 132 22 L 130 34 L 126 48 L 120 58 Z"
      />
      <Path
        fill={LOGO_GRAY_LIGHT}
        d="M 88 74 L 100 90 L 112 74 L 108 82 L 100 96 L 92 82 Z"
      />
      {/* 가운데 골짜기 — 검정(배경과 동일) */}
      <Path
        fill={SPLASH_BLACK}
        d="M 92 134 L 108 134 L 112 108 L 108 88 L 100 72 L 92 88 L 88 108 Z"
      />
    </Svg>
  );
}
