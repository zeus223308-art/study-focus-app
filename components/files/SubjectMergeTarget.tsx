import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

type Rect = { x: number; y: number; width: number; height: number };

type Props = {
  subjectId: string;
  register: (subjectId: string, rect: Rect | null) => void;
  children: React.ReactNode;
  style?: ViewStyle;
  hover?: boolean;
  lifted?: boolean;
};

/** Vault subject card body — drop target for merge (not reorder). */
export function SubjectMergeTarget({
  subjectId,
  register,
  children,
  style,
  hover,
  lifted,
}: Props) {
  const ref = useRef<View>(null);
  const { subjectReorderMeasureTick } = useApp();

  const measure = useCallback(() => {
    ref.current?.measureInWindow((x, y, width, height) => {
      register(subjectId, { x, y, width, height });
    });
  }, [register, subjectId]);

  useEffect(() => {
    measure();
    return () => register(subjectId, null);
  }, [measure, register, subjectId, subjectReorderMeasureTick]);

  return (
    <View
      ref={ref}
      onLayout={measure}
      style={[style, hover && styles.hover, lifted && styles.lifted]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  hover: {
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    borderColor: theme.orange,
    backgroundColor: theme.orangeMuted,
  },
  lifted: {
    opacity: 0.55,
    transform: [{ scale: 0.97 }],
  },
});
