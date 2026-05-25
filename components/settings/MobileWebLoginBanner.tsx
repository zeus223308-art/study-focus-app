import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  GoogleOAuthInAppBrowserBlock,
  useInAppBrowserBlocked,
} from '@/components/settings/GoogleOAuthInAppBrowserBlock';
import { theme } from '@/constants/theme';
import { ensureGoogleDriveSession } from '@/services/cloud/google-session';

/** Dashboard CTA: sign in via mobile web (no APK). */
export function MobileWebLoginBanner() {
  const { t } = useTranslation();
  const router = useRouter();
  const inAppBrowser = useInAppBrowserBlocked();
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    void ensureGoogleDriveSession().then((s) => setHasSession(Boolean(s?.accessToken)));
  }, []);

  if (Platform.OS !== 'web' || hasSession === null || hasSession) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('settings.cloudWebLoginTitle')}</Text>
      <Text style={styles.body}>{t('settings.cloudWebLoginBody')}</Text>
      <GoogleOAuthInAppBrowserBlock />
      {!inAppBrowser ? (
        <Pressable
          style={styles.btn}
          onPress={() => router.push('/(tabs)/settings')}>
          <Text style={styles.btnText}>{t('settings.cloudWebLoginCta')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.grayLight,
    gap: 8,
  },
  title: {
    fontSize: theme.font.body,
    fontWeight: '800',
    color: theme.black,
  },
  body: {
    fontSize: theme.font.caption,
    color: theme.gray,
    lineHeight: 20,
  },
  btn: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: theme.orange,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.white,
  },
});
