import { StyleSheet, View } from 'react-native';

type Props = {
  colors: string[];
  size?: number;
  gap?: number;
  max?: number;
};

/** Small tag-color dots under a calendar day (one per due photo). */
export function CalendarTagDots({ colors, size = 5, gap = 2, max = 4 }: Props) {
  if (colors.length === 0) {
    return <View style={{ width: size, height: size, marginTop: 2 }} />;
  }

  const shown = colors.slice(0, max);
  const radius = size / 2;

  return (
    <View style={[styles.row, { gap, marginTop: 2 }]}>
      {shown.map((color, i) => (
        <View
          key={`${color}-${i}`}
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
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'nowrap',
    maxWidth: '100%',
  },
  dot: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.22)',
  },
});
