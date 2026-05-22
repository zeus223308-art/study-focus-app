import Svg, { Path } from 'react-native-svg';

type Props = {
  width?: number;
  height?: number;
  color?: string;
  highlight?: string;
};

/** M자 = 산 두 봉우리 (넷플릭스 N 느낌) */
export function MountainMLogo({
  width = 140,
  height = 100,
  color = '#B8B8B8',
  highlight = '#E8E8E8',
}: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 140 100">
      <Path d="M 8 98 L 38 12 L 58 52 L 82 12 L 132 98 Z" fill={color} />
      <Path d="M 30 28 L 38 12 L 46 28 Z" fill={highlight} opacity={0.85} />
      <Path d="M 74 28 L 82 12 L 90 28 Z" fill={highlight} opacity={0.85} />
    </Svg>
  );
}
