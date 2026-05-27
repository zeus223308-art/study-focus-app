import { useCallback, useRef } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SubjectDropTarget } from '@/components/files/SubjectDropTarget';
import { SubjectFolderPreview } from '@/components/files/SubjectFolderPreview';
import { SubjectReorderTarget } from '@/components/files/SubjectReorderTarget';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import type { SubjectPreviewItem } from '@/lib/files/subject-previews';
import { useLongPressDragGesture } from '@/lib/ui/long-press-drag';

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

/** Files tab — subject name above card; swipe problem previews inside the card. */
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
    cancelMovingBundle,
  } = useApp();
  const cardRef = useRef<View>(null);
  const dragLifted = reorderingSubjectId === subjectId;
  const reorderHover = reorderHoverSubjectId === subjectId && !dragLifted;

  const tryDropHere = () => {
    if (!movingBundleId || subjectId === dragSourceSubjectId) return;
    cardRef.current?.measureInWindow((x, y, width, height) => {
      const moved = finishBundleDrop(x + width / 2, y + height / 2);
      if (moved) Alert.alert('', t('folder.movedTo', { name: moved }));
    });
  };

  const onShortPress = useCallback(() => {
    if (dragLifted) {
      cancelMovingBundle();
      return;
    }
    if (movingBundleId) return;
    if (reorderingSubjectId) return;
    onPress();
  }, [cancelMovingBundle, dragLifted, movingBundleId, onPress, reorderingSubjectId]);

  const { panHandlers, bindWebMouse } = useLongPressDragGesture({
    enabled: !movingBundleId,
    instantDrag: dragLifted,
    onLift: onLiftForReorder,
    onDragMove: onReorderDragMove,
    onDragEnd: onReorderDragEnd,
    onShortPress,
  });

  const tileBody = (
    <>
      <View style={styles.nameRow}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
      </View>
      <View ref={cardRef} collapsable={false}>
        <SubjectFolderPreview
          variant="vault"
          items={previewItems}
          totalLabel={totalLabel}
          emptyHint={t('vault.previewEmpty')}
          onOpen={() => {
            if (movingBundleId) {
              tryDropHere();
              return;
            }
            if (reorderingSubjectId) return;
            onPress();
          }}
          onGestureLock={onPreviewGestureLock}
        />
      </View>
    </>
  );

  return (
    <SubjectDropTarget subjectId={subjectId} style={styles.wrap}>
      <SubjectReorderTarget
        subjectId={subjectId}
        register={registerSubjectReorderZone}
        hover={reorderHover}
        lifted={dragLifted}>
        <View
          {...(!IS_WEB && !movingBundleId ? panHandlers : {})}
          {...(IS_WEB && !movingBundleId
            ? {
                onMouseDown: (e: {
                  button?: number;
                  nativeEvent: { pageX: number; pageY: number };
                }) => {
                  if (e.button !== undefined && e.button !== 0) return;
                  bindWebMouse(e.nativeEvent.pageX, e.nativeEvent.pageY);
                },
              }
            : {})}>
          {tileBody}
        </View>
      </SubjectReorderTarget>
    </SubjectDropTarget>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    minWidth: 0,
  },
  nameRow: {
    marginBottom: 8,
    marginLeft: 2,
    marginRight: 2,
  },
  name: {
    flex: 1,
    minWidth: 0,
    fontSize: theme.font.body,
    fontWeight: '800',
    color: theme.black,
  },
});
