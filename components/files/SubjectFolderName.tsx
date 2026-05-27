import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

const DOUBLE_TAP_MS = 320;

type Props = {
  subjectId: string;
  name: string;
  lifted?: boolean;
  disabled?: boolean;
  onEditingChange?: (editing: boolean) => void;
  onLongPressMenu?: () => void;
};

export function SubjectFolderName({
  subjectId,
  name,
  lifted,
  disabled,
  onEditingChange,
  onLongPressMenu,
}: Props) {
  const { renameSubject } = useApp();
  const lastTapRef = useRef(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const menuEnabled = Boolean(onLongPressMenu) && !disabled && !editing;

  useEffect(() => {
    setDraft(name);
  }, [name]);

  useEffect(() => {
    onEditingChange?.(editing);
  }, [editing, onEditingChange]);

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    setEditing(false);
    if (!trimmed || trimmed === name) {
      setDraft(name);
      return;
    }
    renameSubject(subjectId, trimmed);
  }, [draft, name, renameSubject, subjectId]);

  const cancel = useCallback(() => {
    setDraft(name);
    setEditing(false);
  }, [name]);

  const openMenu = useCallback(() => {
    onLongPressMenu?.();
  }, [onLongPressMenu]);

  const tryRename = useCallback(() => {
    if (disabled || editing) return;
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      setEditing(true);
      return;
    }
    lastTapRef.current = now;
  }, [disabled, editing]);

  const nameGesture = useMemo(() => {
    const longPress = Gesture.LongPress()
      .minDuration(500)
      .maxDistance(24)
      .enabled(menuEnabled)
      .onStart(() => {
        'worklet';
        runOnJS(openMenu)();
      });

    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .maxDelay(DOUBLE_TAP_MS + 80)
      .enabled(!disabled && !editing)
      .onEnd(() => {
        'worklet';
        runOnJS(tryRename)();
      });

    return Gesture.Exclusive(longPress, doubleTap);
  }, [disabled, editing, menuEnabled, openMenu, tryRename]);

  if (editing) {
    return (
      <View style={styles.nameRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={commit}
          onBlur={commit}
          autoFocus
          selectTextOnFocus
          maxLength={40}
          returnKeyType="done"
          style={styles.input}
        />
      </View>
    );
  }

  return (
    <GestureDetector gesture={nameGesture}>
      <View
        style={styles.nameRow}
        accessibilityRole="button"
        accessibilityLabel={name}
        accessibilityHint="Double tap to rename; long press for menu">
        <Text style={[styles.name, lifted && styles.nameLifted]} numberOfLines={1}>
          {name}
        </Text>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  nameRow: {
    marginBottom: 8,
    marginLeft: 2,
    marginRight: 2,
    minHeight: 28,
    justifyContent: 'center',
  },
  name: {
    fontSize: theme.font.body,
    fontWeight: '800',
    color: theme.black,
  },
  nameLifted: {
    color: theme.orange,
  },
  input: {
    fontSize: theme.font.body,
    fontWeight: '800',
    color: theme.black,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderWidth: 1.5,
    borderColor: theme.orange,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.surface,
  },
});
