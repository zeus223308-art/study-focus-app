import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useWebLongPress } from '@/hooks/useWebLongPress';

const DOUBLE_TAP_MS = 320;

type Props = {
  subjectId: string;
  name: string;
  lifted?: boolean;
  disabled?: boolean;
  onEditingChange?: (editing: boolean) => void;
  /** Long-press on subject name (Files tab menu). */
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
  const hostRef = useRef<View>(null);
  const lastTapRef = useRef(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const menuEnabled = Boolean(onLongPressMenu) && !disabled && !editing;

  useWebLongPress(hostRef, {
    enabled: Platform.OS === 'web' && menuEnabled,
    onLongPress: () => onLongPressMenu?.(),
  });

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

  const handlePress = useCallback(() => {
    if (disabled || editing) return;
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      setEditing(true);
      return;
    }
    lastTapRef.current = now;
  }, [disabled, editing]);

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
          {...(Platform.OS === 'web'
            ? ({
                onKeyPress: (e: { nativeEvent: { key?: string } }) => {
                  if (e.nativeEvent.key === 'Escape') cancel();
                },
              } as object)
            : {})}
        />
      </View>
    );
  }

  return (
    <Pressable
      ref={hostRef}
      onPress={handlePress}
      onLongPress={Platform.OS === 'web' ? undefined : onLongPressMenu}
      delayLongPress={500}
      disabled={disabled}
      hitSlop={8}
      style={styles.nameRow}
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityHint="Double tap to rename; long press for menu">
      <Text style={[styles.name, lifted && styles.nameLifted]} numberOfLines={1}>
        {name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  nameRow: {
    marginBottom: 8,
    marginLeft: 2,
    marginRight: 2,
    minHeight: 24,
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
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
});
