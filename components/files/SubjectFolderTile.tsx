import { useCallback, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SubjectDropTarget } from '@/components/files/SubjectDropTarget';
import { SubjectFolderName } from '@/components/files/SubjectFolderName';
import { SubjectFolderPreview } from '@/components/files/SubjectFolderPreview';
import { SubjectReorderTarget } from '@/components/files/SubjectReorderTarget';
import { HoldDragSurface } from '@/components/ui/HoldDragSurface';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import type { SubjectPreviewItem } from '@/lib/files/subject-previews';

const IS_WEB = Platform.OS === 'web';

type Props = {
  subjectId: string;
  name: string;
  totalLabel: string;
  previewItems: SubjectPreviewItem[];
  onPress: () => void;
  onLiftForReorder: () => void;
  onReorderDragMove?: (pageX: number, pageY: number) => void;
  onReorderDragEnd?: (moved: boolean, pageX: number, pageY: number) => void;
  onPreviewGestureLock: (locked: boolean) => void;
};

export function SubjectFolderTile({
  subjectId,
  name,
  totalLabel,
  previewItems,
  onPress,
  onLiftForReorder,
  onReorderDragMove,
  onReorderDragEnd,
  onPreviewGestureLock,
}: Props) {
  const { t } = useTranslation();
  const {
    movingBundleId,
    dragSourceSubjectId,
    finishBundleDrop,
    reorderingSubjectId,
    reorderHoverSubjectId,
    registerSubjectReorderZone,
  } = useApp();
  const cardRef = useRef<View>(null);
  const [nameEditing, setNameEditing] = useState(false);
  const isActive = reorderingSubjectId === subjectId;
  const reorderHover = reorderHoverSubjectId === subjectId && !isActive;
  const dragEnabled = !movingBundleId && Boolean(onReorderDragMove) && !nameEditing;

  const tryDropHere = () => {
    if (!movingBundleId || subjectId === dragSourceSubjectId) return;
    cardRef.current?.measureInWindow((x, y, width, height) => {
      const moved = finishBundleDrop(x + width / 2, y + height / 2);
      if (moved) Alert.alert('', t('folder.movedTo', { name: moved }));
    });
  };

  const openFolder = useCallback(() => {
    if (movingBundleId) {
      tryDropHere();
      return;
    }
    if (reorderingSubjectId) return;
    onPress();
  }, [movingBundleId, onPress, reorderingSubjectId]);

  const handleLift = useCallback(() => {
    onLiftForReorder();
  }, [onLiftForReorder]);

  const handleDragEnd = useCallback(
    (moved: boolean, pageX: number, pageY: number) => {
      onReorderDragEnd?.(moved, pageX, pageY);
    },
    [onReorderDragEnd]
  );

  return (
    <SubjectDropTarget subjectId={subjectId} style={styles.wrap}>
      <SubjectReorderTarget
        subjectId={subjectId}
        register={registerSubjectReorderZone}
        hover={reorderHover}
        lifted={isActive}>
        <SubjectFolderName
          subjectId={subjectId}
          name={name}
          lifted={isActive}
          disabled={Boolean(movingBundleId) || Boolean(reorderingSubjectId)}
          onEditingChange={setNameEditing}
        />
        <HoldDragSurface
          enabled={dragEnabled}
          instantDrag={isActive}
          onLift={handleLift}
          onDragMove={onReorderDragMove}
          onDragEnd={handleDragEnd}
          onPress={openFolder}
          onGestureActiveChange={onPreviewGestureLock}
          style={[
            styles.dragSurface,
            isActive && styles.dragSurfaceLifted,
            reorderHover && styles.dragSurfaceHover,
          ]}>
          <View ref={cardRef} collapsable={false} pointerEvents="box-none">
            <SubjectFolderPreview
              variant="vault"
              items={previewItems}
              totalLabel={totalLabel}
              emptyHint={t('vault.previewEmpty')}
              passthroughGestures
              onOpen={openFolder}
              onGestureLock={onPreviewGestureLock}
            />
          </View>
        </HoldDragSurface>
      </SubjectReorderTarget>
    </SubjectDropTarget>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    minWidth: 0,
  },
  dragSurface: {
    width: '100%',
    borderRadius: theme.radius.sm,
    ...(IS_WEB ? ({ cursor: 'grab', touchAction: 'manipulation', userSelect: 'none' } as object) : null),
  },
  dragSurfaceHover: {
    borderWidth: 2,
    borderColor: theme.orange,
    backgroundColor: theme.orangeMuted,
  },
  dragSurfaceLifted: {
    transform: [{ scale: 1.03 }],
    zIndex: 30,
    borderWidth: 2,
    borderColor: theme.orange,
    backgroundColor: theme.orangeMuted,
    ...theme.cardShadow,
  },
});
