import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { theme } from '@/constants/theme';

type Rect = { x: number; y: number; width: number; height: number };

type Props = {
  itemKey: string;
  register: (itemKey: string, rect: Rect | null) => void;
  children: React.ReactNode;
  style?: ViewStyle;
  hover?: boolean;
};

/** Album tile drop target for drag-to-reorder. */
export function ItemDropTarget({ itemKey, register, children, style, hover }: Props) {
  const ref = useRef<View>(null);

  const measure = useCallback(() => {
    ref.current?.measureInWindow((x, y, width, height) => {
      register(itemKey, { x, y, width, height });
    });
  }, [itemKey, register]);

  useEffect(() => {
    measure();
    return () => register(itemKey, null);
  }, [itemKey, measure, register]);

  return (
    <View
      ref={ref}
      onLayout={measure}
      style={[style, hover && styles.hover]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  hover: {
    borderRadius: theme.radius.sm,
    backgroundColor: theme.orangeMuted,
  },
});
