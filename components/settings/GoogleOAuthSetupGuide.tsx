import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import {
  GOOGLE_OAUTH_JS_ORIGINS,
  GOOGLE_OAUTH_REDIRECT_URIS,
} from '@/services/cloud/google-config';

const CONSOLE_CREDENTIALS =
  'https://console.cloud.google.com/apis/credentials/oauthclient';
const CONSOLE_DRIVE_API =
  'https://console.cloud.google.com/apis/library/drive.googleapis.com';

async function copyText(text: string): Promise<boolean> {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

function CopyRow({ value, onCopied }: { value: string; onCopied: () => void }) {
  const { t } = useTranslation();

  const handleCopy = useCallback(async () => {
    const ok = await copyText(value);
    if (ok) onCopied();
    else Linking.openURL(value).catch(() => undefined);
  }, [onCopied, value]);

  return (
    <View style={styles.copyRow}>
      <Text style={styles.copyValue} selectable>
        {value}
      </Text>
      <Pressable onPress={handleCopy} style={styles.copyBtn} hitSlop={6}>
        <Text style={styles.copyBtnText}>{t('settings.cloudCopy')}</Text>
      </Pressable>
    </View>
  );
}

export function GoogleOAuthSetupGuide() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState<string | null>(null);

  const markCopied = useCallback((key: string) => {
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('settings.cloudSetupTitle')}</Text>
      <Text style={styles.step}>{t('settings.cloudSetupStep1')}</Text>
      <Pressable onPress={() => Linking.openURL(CONSOLE_DRIVE_API)} style={styles.linkRow}>
        <Text style={styles.linkText}>{t('settings.cloudSetupDriveApi')}</Text>
      </Pressable>
      <Text style={styles.step}>{t('settings.cloudSetupStep2')}</Text>
      <Pressable onPress={() => Linking.openURL(CONSOLE_CREDENTIALS)} style={styles.linkRow}>
        <Text style={styles.linkText}>{t('settings.cloudSetupCreateClient')}</Text>
      </Pressable>
      <Text style={styles.step}>{t('settings.cloudSetupOrigins')}</Text>
      {GOOGLE_OAUTH_JS_ORIGINS.map((uri) => (
        <CopyRow key={uri} value={uri} onCopied={() => markCopied(uri)} />
      ))}
      <Text style={styles.step}>{t('settings.cloudSetupRedirects')}</Text>
      {GOOGLE_OAUTH_REDIRECT_URIS.map((uri) => (
        <CopyRow key={uri} value={uri} onCopied={() => markCopied(uri)} />
      ))}
      <Text style={styles.step}>{t('settings.cloudSetupStep3')}</Text>
      <Text style={styles.codeHint} selectable>
        npm run setup:google-oauth -- YOUR_ID.apps.googleusercontent.com
      </Text>
      {copied ? <Text style={styles.copied}>{t('settings.cloudCopied')}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6,
  },
  title: {
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.graySecondary,
    marginTop: 4,
  },
  step: {
    fontSize: theme.font.caption,
    fontWeight: '600',
    color: theme.gray,
    lineHeight: 18,
    marginTop: 6,
  },
  linkRow: {
    paddingVertical: 6,
  },
  linkText: {
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.orange,
    textDecorationLine: 'underline',
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  copyValue: {
    flex: 1,
    fontSize: 11,
    color: theme.black,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  copyBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: theme.orangeMuted,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.orange,
  },
  codeHint: {
    fontSize: 11,
    color: theme.black,
    backgroundColor: theme.beige,
    padding: 10,
    borderRadius: 8,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  copied: {
    fontSize: theme.font.caption,
    fontWeight: '600',
    color: theme.success,
  },
});
