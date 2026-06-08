import { StyleSheet, View } from 'react-native';

type Props = {
  colors: string[];
  size?: number;
  gap?: number;
  max?: number;
};

function TagDot({ color, size }: { color: string; size: number }) {
  const radius = size / 2;
  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: color,
        },
      ]}
    />
  );
}

/** Small tag-color dots under a calendar day (one per due photo). */
export function CalendarTagDots({ colors, size = 5, gap = 2, max = 4 }: Props) {
  if (colors.length === 0) {
    return <View style={{ width: size, height: size, marginTop: 2 }} />;
  }

  const shown = colors.slice(0, max);
  const useStackedLayout = shown.length >= 4;
  const topRow = useStackedLayout ? shown.slice(0, 3) : shown;
  const bottomRow = useStackedLayout ? shown.slice(3) : [];

  return (
    <View style={[styles.stack, { marginTop: 2, gap }]}>
      <View style={[styles.row, { gap }]}>
        {topRow.map((color, i) => (
          <TagDot key={`top-${color}-${i}`} color={color} size={size} />
        ))}
      </View>
      {bottomRow.length > 0 ? (
        <View style={[styles.row, { gap }]}>
          {bottomRow.map((color, i) => (
            <TagDot key={`bottom-${color}-${i}`} color={color} size={size} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  dot: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.22)',
  },
});
