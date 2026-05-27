import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';

import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

const DOUBLE_TAP_MS = 320;

type Props = {
  subjectId: string;
  name: string;
  lifted?: boolean;
  disabled?: boolean;
  /** Single tap opens the subject folder; double tap renames. */
  onOpen?: () => void;
  onEditingChange?: (editing: boolean) => void;
};

export function SubjectFolderName({
  subjectId,
  name,
  lifted,
  disabled,
  onOpen,
  onEditingChange,
}: Props) {
  const { renameSubject } = useApp();
  const lastTapRef = useRef(0);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

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

  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current != null) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearOpenTimer(), [clearOpenTimer]);

  const handlePress = useCallback(() => {
    if (disabled || editing) return;
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      clearOpenTimer();
      lastTapRef.current = 0;
      setEditing(true);
      return;
    }
    lastTapRef.current = now;
    clearOpenTimer();
    openTimerRef.current = setTimeout(() => {
      openTimerRef.current = null;
      onOpen?.();
    }, DOUBLE_TAP_MS);
  }, [clearOpenTimer, disabled, editing, onOpen]);

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
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.65}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      style={styles.nameRow}
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityHint="Tap to open folder. Double tap to rename.">
      <Text style={[styles.name, lifted && styles.nameLifted]} numberOfLines={1}>
        {name}
      </Text>
    </TouchableOpacity>
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
