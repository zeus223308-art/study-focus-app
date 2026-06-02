import Svg, { Path } from 'react-native-svg';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';

export const SPLASH_BLACK = '#000000';
export const LOGO_WHITE = '#FFFFFF';
export const LOGO_GRAY = '#6B6B6B';
export const LOGO_GRAY_DARK = '#3A3A3A';
export const LOGO_GRAY_LIGHT = '#B5B5B5';
/** Outer rim — like inner highlight, slightly darker */
export const LOGO_GRAY_RIM = '#949494';

const MOUNTAIN_OUTLINE = `
  M 12 134
  C 12 118, 18 96, 30 76
  C 44 52, 54 34, 68 22
  C 76 16, 84 18, 92 28
  C 96 42, 98 58, 100 72
  C 102 58, 104 42, 108 28
  C 116 18, 124 16, 132 22
  C 146 34, 156 52, 170 76
  C 182 96, 188 118, 188 134
  Z
`;

const M_SHINE_PATH = `
  M 66 31
  C 78 19, 90 30, 100 61
  C 110 30, 122 19, 134 31
`;

const SHINE_PATH_LENGTH = 132;
const SHINE_SEGMENT_LENGTH = 30;
const AnimatedPath = Animated.createAnimatedComponent(Path);

type Props = {
  width?: number;
  height?: number;
  /** 0 -> 1, shine moves from M start to end once. */
  shineProgress?: SharedValue<number>;
};

/**
 * Twin-peak mountain mark — soft natural ridges (black / gray / white).
 */
export function MountainMLogo({ width = 240, height = 168, shineProgress }: Props) {
  const shineAnimatedProps = useAnimatedProps(() => {
    const p = Math.max(0, Math.min(1, shineProgress?.value ?? 0));
    return {
      strokeDashoffset: SHINE_PATH_LENGTH - p * (SHINE_PATH_LENGTH + SHINE_SEGMENT_LENGTH),
      opacity: p <= 0.02 || p >= 0.98 ? 0 : 1,
    };
  });

  return (
    <Svg width={width} height={height} viewBox="0 0 200 140">
      {/* Outer rim — soft edge like inner highlight, slightly darker */}
      <Path
        d={MOUNTAIN_OUTLINE}
        fill="none"
        stroke={LOGO_GRAY_RIM}
        strokeWidth={1.35}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Base silhouette */}
      <Path fill={LOGO_GRAY_DARK} d={MOUNTAIN_OUTLINE} />

      {/* Left slope (mid tone) */}
      <Path
        fill={LOGO_GRAY}
        d="
          M 24 134
          C 30 108, 40 82, 52 58
          C 60 42, 66 30, 74 24
          C 82 34, 90 52, 100 72
          L 100 134
          Z
        "
      />

      {/* Right slope (mid tone) */}
      <Path
        fill={LOGO_GRAY}
        d="
          M 176 134
          C 170 108, 160 82, 148 58
          C 140 42, 134 30, 126 24
          C 118 34, 110 52, 100 72
          L 100 134
          Z
        "
      />

      {/* Snow caps */}
      <Path
        fill={LOGO_WHITE}
        stroke={LOGO_GRAY_RIM}
        strokeWidth={0.7}
        d="M 64 28 C 70 14, 78 16, 84 26 C 80 34, 72 36, 64 28 Z"
      />
      <Path
        fill={LOGO_WHITE}
        stroke={LOGO_GRAY_RIM}
        strokeWidth={0.7}
        d="M 136 28 C 130 14, 122 16, 116 26 C 120 34, 128 36, 136 28 Z"
      />

      {/* Ridge highlight between peaks */}
      <Path
        fill={LOGO_GRAY_LIGHT}
        d="M 96 68 C 100 58, 100 52, 100 58 C 104 68, 104 74, 100 80 C 96 74, 96 68 Z"
        opacity={0.85}
      />

      {/* M line shine sweep: start -> end, then disappears */}
      <AnimatedPath
        d={M_SHINE_PATH}
        stroke={LOGO_WHITE}
        strokeWidth={2.3}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${SHINE_SEGMENT_LENGTH} ${SHINE_PATH_LENGTH}`}
        animatedProps={shineAnimatedProps}
      />

      {/* Center valley */}
      <Path
        fill={SPLASH_BLACK}
        d="M 92 134 C 96 108, 100 88, 104 108 C 108 134, 92 134 Z"
      />
    </Svg>
  );
}
