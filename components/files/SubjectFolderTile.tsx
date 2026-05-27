import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Alert, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SubjectDropTarget } from '@/components/files/SubjectDropTarget';
import { SubjectFolderPreview } from '@/components/files/SubjectFolderPreview';
import { SubjectReorderTarget } from '@/components/files/SubjectReorderTarget';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import type { SubjectPreviewItem } from '@/lib/files/subject-previews';

const IS_WEB = Platform.OS === 'web';
const DRAG_THRESHOLD = 8;

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
  } = useApp();
  const cardRef = useRef<View>(null);
  const didDragRef = useRef(false);
  const pointerDragRef = useRef({ active: false, startX: 0, startY: 0 });
  const pendingDragStart = useRef<{ pageX: number; pageY: number } | null>(null);
  const dragLifted = reorderingSubjectId === subjectId;
  const reorderHover = reorderHoverSubjectId === subjectId && !dragLifted;

  const tryDropHere = () => {
    if (!movingBundleId || subjectId === dragSourceSubjectId) return;
    cardRef.current?.measureInWindow((x, y, width, height) => {
      const moved = finishBundleDrop(x + width / 2, y + height / 2);
      if (moved) Alert.alert('', t('folder.movedTo', { name: moved }));
    });
  };

  const endDrag = useCallback(
    (pageX: number, pageY: number) => {
      if (!pointerDragRef.current.active) return;
      pointerDragRef.current.active = false;
      onReorderDragEnd?.(didDragRef.current, pageX, pageY);
      didDragRef.current = false;
    },
    [onReorderDragEnd]
  );

  const moveDrag = useCallback(
    (pageX: number, pageY: number) => {
      if (!pointerDragRef.current.active || !dragLifted) return;
      const dx = pageX - pointerDragRef.current.startX;
      const dy = pageY - pointerDragRef.current.startY;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        didDragRef.current = true;
      }
      onReorderDragMove?.(pageX, pageY);
    },
    [dragLifted, onReorderDragMove]
  );

  const startDrag = useCallback(
    (pageX: number, pageY: number) => {
      if (!dragLifted) return;
      didDragRef.current = false;
      pointerDragRef.current = { active: true, startX: pageX, startY: pageY };
    },
    [dragLifted]
  );

  useEffect(() => {
    if (!dragLifted || !pendingDragStart.current) return;
    const { pageX, pageY } = pendingDragStart.current;
    pendingDragStart.current = null;
    startDrag(pageX, pageY);
  }, [dragLifted, startDrag]);

  const liftForReorder = useCallback(
    (event?: { nativeEvent: { pageX: number; pageY: number } }) => {
      if (event) {
        pendingDragStart.current = {
          pageX: event.nativeEvent.pageX,
          pageY: event.nativeEvent.pageY,
        };
      }
      onLiftForReorder();
    },
    [onLiftForReorder]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => dragLifted,
        onMoveShouldSetPanResponder: () => dragLifted,
        onPanResponderGrant: (evt) => {
          const { pageX, pageY } = evt.nativeEvent;
          startDrag(pageX, pageY);
        },
        onPanResponderMove: (evt) => {
          const { pageX, pageY } = evt.nativeEvent;
          moveDrag(pageX, pageY);
        },
        onPanResponderRelease: (evt) => {
          const { pageX, pageY } = evt.nativeEvent;
          endDrag(pageX, pageY);
        },
        onPanResponderTerminate: (evt) => {
          const { pageX, pageY } = evt.nativeEvent;
          endDrag(pageX, pageY);
        },
      }),
    [dragLifted, endDrag, moveDrag, startDrag]
  );

  const bindWebMouse = useCallback(
    (pageX: number, pageY: number) => {
      if (!dragLifted || typeof document === 'undefined') return;
      startDrag(pageX, pageY);
      const onMove = (ev: MouseEvent) => moveDrag(ev.pageX, ev.pageY);
      const onUp = (ev: MouseEvent) => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        endDrag(ev.pageX, ev.pageY);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [dragLifted, endDrag, moveDrag, startDrag]
  );

  const tileBody = (
    <>
      <View style={styles.nameRow}>
        <Pressable
          style={styles.namePress}
          onLongPress={liftForReorder}
          delayLongPress={420}
          onPress={onPress}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
        </Pressable>
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
          onLongPress={() => liftForReorder()}
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
          {...(!IS_WEB && dragLifted ? panResponder.panHandlers : {})}
          {...(IS_WEB && dragLifted
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
  namePress: {
    flex: 1,
    minWidth: 0,
  },
});
