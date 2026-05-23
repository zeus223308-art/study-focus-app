import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { theme } from '@/constants/theme';
import {
  isValidGoogleClientId,
  saveStoredGoogleClientId,
} from '@/services/cloud/google-client-store';

type Props = {
  onSaved: () => void | Promise<void>;
};

export function GoogleOAuthClientIdForm({ onSaved }: Props) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async () => {
    setError(null);
    setSaved(false);
    const trimmed = value.trim();
    if (!isValidGoogleClientId(trimmed)) {
      setError(t('settings.cloudClientIdInvalid'));
      return;
    }
    setBusy(true);
    try {
      await saveStoredGoogleClientId(trimmed);
      await onSaved();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.cloudClientIdSaveError'));
    } finally {
      setBusy(false);
    }
  }, [onSaved, t, value]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('settings.cloudClientIdTitle')}</Text>
      <Text style={styles.hint}>{t('settings.cloudClientIdHint')}</Text>
      <TextInput
        value={value}
        onChangeText={(text) => {
          setValue(text);
          setError(null);
          setSaved(false);
        }}
        placeholder={t('settings.cloudClientIdPlaceholder')}
        placeholderTextColor={theme.grayMuted}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
        editable={!busy}
      />
      <Pressable
        onPress={busy ? undefined : handleSave}
        style={[styles.saveBtn, busy && styles.saveBtnBusy]}
        disabled={busy}>
        {busy ? (
          <ActivityIndicator color={theme.white} size="small" />
        ) : (
          <Text style={styles.saveBtnText}>{t('settings.cloudClientIdSave')}</Text>
        )}
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {saved ? <Text style={styles.success}>{t('settings.cloudClientIdSaved')}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  title: {
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.black,
  },
  hint: {
    fontSize: theme.font.caption,
    fontWeight: '600',
    color: theme.gray,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.grayLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 10 : 12,
    fontSize: theme.font.bodySmall,
    color: theme.black,
    backgroundColor: theme.white,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  saveBtn: {
    backgroundColor: theme.orange,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  saveBtnBusy: { opacity: 0.85 },
  saveBtnText: {
    color: theme.white,
    fontSize: theme.font.body,
    fontWeight: '700',
  },
  error: {
    fontSize: theme.font.caption,
    fontWeight: '600',
    color: theme.danger,
    lineHeight: 18,
  },
  success: {
    fontSize: theme.font.caption,
    fontWeight: '600',
    color: theme.success,
  },
});
