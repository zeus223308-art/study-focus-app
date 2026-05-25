import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import {
  isInAppOrEmbeddedBrowser,
  MEMORYSHERPA_WEB_APP_URL,
} from '@/lib/cloud/detect-in-app-browser';
import { showMessage } from '@/lib/ui/confirm';

export function useInAppBrowserBlocked(): boolean {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') setBlocked(isInAppOrEmbeddedBrowser());
  }, []);

  return blocked;
}

export function GoogleOAuthInAppBrowserBlock() {
  const { t } = useTranslation();
  const blocked = useInAppBrowserBlocked();

  const copyLink = useCallback(async () => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(MEMORYSHERPA_WEB_APP_URL);
      }
      showMessage(t('settings.cloud'), t('settings.cloudWebLinkCopied'));
    } catch {
      showMessage(t('settings.cloud'), MEMORYSHERPA_WEB_APP_URL);
    }
  }, [t]);

  if (Platform.OS !== 'web' || !blocked) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('settings.cloudOAuthDisallowedUseragent')}</Text>
      <Text style={styles.body}>{t('settings.cloudOAuthOpenInBrowserSteps')}</Text>
      <Text style={styles.url} selectable>
        {MEMORYSHERPA_WEB_APP_URL}
      </Text>
      <Pressable onPress={() => void copyLink()} style={styles.btn}>
        <Text style={styles.btnText}>{t('settings.cloudCopyWebLink')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: theme.orangeMuted,
    gap: 8,
  },
  title: {
    fontSize: theme.font.caption,
    fontWeight: '800',
    color: theme.orange,
    lineHeight: 20,
  },
  body: {
    fontSize: 11,
    color: theme.black,
    lineHeight: 17,
  },
  url: {
    fontSize: 10,
    color: theme.gray,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  btn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: theme.orange,
  },
  btnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.white,
  },
});
