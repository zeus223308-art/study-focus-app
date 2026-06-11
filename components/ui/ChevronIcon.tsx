import { Platform } from 'react-native';
import { SymbolView } from 'expo-symbols';
import Svg, { Path } from 'react-native-svg';

type Direction = 'left' | 'right';

type Props = {
  direction: Direction;
  size?: number;
  color: string;
};

const PATHS: Record<Direction, string> = {
  left: 'M15 6l-6 6 6 6',
  right: 'M9 6l6 6-6 6',
};

/** Inline SVG on web; SF Symbol on native — stable chevrons in ScrollView. */
export function ChevronIcon({ direction, size = 22, color }: Props) {
  if (Platform.OS === 'web') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d={PATHS[direction]}
          stroke={color}
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  return (
    <SymbolView
      name={
        direction === 'left'
          ? { ios: 'chevron.left', android: 'chevron_left', web: 'arrow_back' }
          : { ios: 'chevron.right', android: 'chevron_right', web: 'arrow_forward' }
      }
      size={size}
      tintColor={color}
    />
  );
}
