import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useApp } from '@/context/AppContext';
import { theme } from '@/constants/theme';

type Props = {
  subjectId: string;
  children: React.ReactNode;
  style?: ViewStyle;
  disabled?: boolean;
};

export function SubjectDropTarget({ subjectId, children, style, disabled }: Props) {
  const { registerSubjectDropZone, dragHoverSubjectId, movingBundleId, dragSourceSubjectId } =
    useApp();
  const ref = useRef<View>(null);
  const isHover = movingBundleId != null && dragHoverSubjectId === subjectId;
  const canDrop = movingBundleId != null && subjectId !== dragSourceSubjectId;

  const measure = useCallback(() => {
    ref.current?.measureInWindow((x, y, width, height) => {
      registerSubjectDropZone(subjectId, { x, y, width, height });
    });
  }, [registerSubjectDropZone, subjectId]);

  useEffect(() => {
    if (!disabled) measure();
    return () => registerSubjectDropZone(subjectId, null);
  }, [disabled, measure, registerSubjectDropZone, subjectId]);

  return (
    <View
      ref={ref}
      onLayout={measure}
      style={[
        style,
        canDrop && styles.dropReady,
        isHover && styles.dropHover,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  dropReady: {
    borderRadius: theme.radius.sm,
  },
  dropHover: {
    backgroundColor: theme.orangeMuted,
    borderColor: theme.orange,
    borderWidth: 2,
  },
});
