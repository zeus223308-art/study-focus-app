import { useTranslation } from 'react-i18next';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { GOOGLE_IOS_BUNDLE_ID } from '@/lib/cloud/google-ios-oauth';
import {
  GOOGLE_OAUTH_CONSENT_URL,
  isNativeGoogleClientConfigured,
} from '@/services/cloud/google-config';

type Props = {
  redirectUri: string;
};

export function GoogleOAuthMobileGuide({ redirectUri }: Props) {
  const { t } = useTranslation();
  if (Platform.OS === 'web') return null;

  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const hasNativeClient = isNativeGoogleClientConfigured(platform);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('settings.cloudMobileOAuthTitle')}</Text>
      <Text style={styles.body}>{t('settings.cloudMobileOAuthTestUsers')}</Text>
      <Pressable onPress={() => Linking.openURL(GOOGLE_OAUTH_CONSENT_URL)} style={styles.link}>
        <Text style={styles.linkText}>{t('settings.cloudMobileOAuthOpenConsent')}</Text>
      </Pressable>
      <Text style={styles.body}>{t('settings.cloudMobileOAuthSameProject')}</Text>

      {platform === 'ios' ? (
        <>
          <Text style={styles.step}>{t('settings.cloudMobileOAuthIosBundle')}</Text>
          <Text style={styles.code} selectable>
            {GOOGLE_IOS_BUNDLE_ID}
          </Text>
          <Text style={styles.hint}>{t('settings.cloudMobileOAuthIosRebuild')}</Text>
        </>
      ) : null}

      {!hasNativeClient ? (
        <>
          <Text style={styles.warn}>
            {platform === 'ios'
              ? t('settings.cloudMobileOAuthNeedIosClient')
              : t('settings.cloudMobileOAuthNeedNativeClient')}
          </Text>
          {platform !== 'ios' ? (
            <>
              <Text style={styles.step}>{t('settings.cloudMobileOAuthRedirectHint')}</Text>
              <Text style={styles.code} selectable>
                {redirectUri}
              </Text>
            </>
          ) : null}
          <Text style={styles.hint}>{t('settings.cloudMobileOAuthRedirectNote')}</Text>
        </>
      ) : (
        <Text style={styles.ok}>{t('settings.cloudMobileOAuthNativeOk')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.grayLight,
  },
  title: {
    fontSize: theme.font.caption,
    fontWeight: '800',
    color: theme.graySecondary,
    marginTop: 8,
  },
  body: { fontSize: theme.font.caption, color: theme.gray, lineHeight: 20 },
  warn: {
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.orange,
    lineHeight: 20,
  },
  ok: {
    fontSize: theme.font.caption,
    fontWeight: '600',
    color: theme.success,
    lineHeight: 20,
  },
  step: {
    fontSize: theme.font.caption,
    fontWeight: '600',
    color: theme.gray,
    marginTop: 4,
  },
  code: {
    fontSize: 11,
    color: theme.black,
    backgroundColor: theme.beige,
    padding: 10,
    borderRadius: 8,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  hint: { fontSize: 11, color: theme.grayMuted, lineHeight: 16 },
  link: { paddingVertical: 4 },
  linkText: {
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.orange,
    textDecorationLine: 'underline',
  },
});
