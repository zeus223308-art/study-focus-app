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
import { normalizeSubjectColor } from '@/lib/domain/subject-colors';

const DOUBLE_TAP_MS = 320;

type Props = {
  subjectId: string;
  name: string;
  color?: string;
  lifted?: boolean;
  disabled?: boolean;
  onEditingChange?: (editing: boolean) => void;
  belowPreview?: boolean;
};

export function SubjectFolderName({
  subjectId,
  name,
  color,
  lifted,
  disabled,
  onEditingChange,
  belowPreview = false,
}: Props) {
  const { renameSubject } = useApp();
  const lastTapRef = useRef(0);
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

  const nameColor = color ? normalizeSubjectColor(color) : theme.black;

  if (editing) {
    return (
      <View style={[styles.nameRow, belowPreview && styles.nameRowBelow]}>
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
      onPress={handlePress}
      disabled={disabled}
      hitSlop={8}
      style={[styles.nameRow, belowPreview && styles.nameRowBelow]}
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityHint="Double tap to rename">
      <Text
        style={[styles.name, { color: lifted ? theme.orange : nameColor }]}
        numberOfLines={1}>
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
  nameRowBelow: {
    marginTop: 6,
    marginBottom: 0,
    minHeight: 20,
  },
  name: {
    fontSize: theme.font.body,
    fontWeight: '800',
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
