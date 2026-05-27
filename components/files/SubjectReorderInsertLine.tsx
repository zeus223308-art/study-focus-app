import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

type Props = {
  panelRef: React.RefObject<View | null>;
};

/** Orange vertical marker when dragging a subject into a gap (reorder). */
export function SubjectReorderInsertLine({ panelRef }: Props) {
  const { reorderingSubjectId, reorderInsertLineX, subjectReorderMeasureTick } = useApp();
  const [lineLeft, setLineLeft] = useState<number | null>(null);

  const measure = useCallback(() => {
    if (reorderInsertLineX == null) {
      setLineLeft(null);
      return;
    }
    panelRef.current?.measureInWindow((panelX) => {
      setLineLeft(reorderInsertLineX - panelX - 1.5);
    });
  }, [panelRef, reorderInsertLineX]);

  useEffect(() => {
    measure();
  }, [measure, subjectReorderMeasureTick, reorderingSubjectId]);

  if (!reorderingSubjectId || lineLeft == null) return null;

  return <View pointerEvents="none" style={[styles.line, { left: lineLeft }]} />;
}

const styles = StyleSheet.create({
  line: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: theme.orange,
    borderRadius: 2,
    zIndex: 50,
    elevation: 50,
  },
});
