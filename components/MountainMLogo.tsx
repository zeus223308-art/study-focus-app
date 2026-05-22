import Svg, { Path } from 'react-native-svg';

/** 스플래시 로고 — 네이비 #001A33 + 흰색 산 M */
export const SPLASH_NAVY = '#001A33';
export const LOGO_WHITE = '#FFFFFF';

type Props = {
  width?: number;
  height?: number;
  color?: string;
};

export function MountainMLogo({ width = 200, height = 140, color = LOGO_WHITE }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 200 140">
      <Path
        fill={color}
        d="
          M 26 134
          L 54 134
          L 56 112 L 58 94 L 56 80 L 60 66 L 58 54 L 62 44
          L 59 38 L 63 30 L 60 24 L 64 16 L 61 10 L 66 6 L 63 12
          L 68 22 L 70 34 L 74 48 L 80 64 L 92 80 L 100 94
          L 108 80 L 120 64 L 126 48 L 130 34 L 132 22 L 137 12
          L 134 6 L 139 10 L 136 16 L 140 24 L 137 30 L 141 38
          L 138 44 L 142 54 L 140 66 L 144 80 L 142 94 L 144 112
          L 146 134
          L 174 134
          L 174 138
          L 26 138
          Z
        "
      />
    </Svg>
  );
}
