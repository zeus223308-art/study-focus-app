import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  GoogleOAuthInAppBrowserBlock,
  useInAppBrowserBlocked,
} from '@/components/settings/GoogleOAuthInAppBrowserBlock';
import { GoogleOAuthClientIdForm } from '@/components/settings/GoogleOAuthClientIdForm';
import { GoogleOAuthMobileGuide } from '@/components/settings/GoogleOAuthMobileGuide';
import { GoogleOAuthSetupGuide } from '@/components/settings/GoogleOAuthSetupGuide';
import { GoogleSignInButton } from '@/components/settings/GoogleSignInButton';
import { SettingsRow } from '@/components/SettingsGroup';
import { theme } from '@/constants/theme';
import { BUTTON_LABEL_DEFAULT } from '@/lib/ui/button-label';
import { webHairlineBottom, webHairlineTop } from '@/lib/ui/web-divider';
import { useApp } from '@/context/AppContext';
import { useGoogleDriveAuth } from '@/hooks/useGoogleDriveAuth';
import { formatRelativeSyncTime } from '@/lib/cloud/sync-label';
import { finishGoogleLogin } from '@/lib/cloud/finish-google-login';
import { confirmDestructive, showMessage } from '@/lib/ui/confirm';
import { showToast } from '@/lib/ui/toast-registry';
import { cleanGoogleOAuthUrl } from '@/services/cloud/google-oauth-callback';
import { allowsDevClientIdOverride } from '@/services/cloud/google-client-store';
import { googleOAuthErrorMessage } from '@/lib/cloud/google-oauth-errors';
import { ensureGoogleDriveSession } from '@/services/cloud/google-session';
import { countAppPages } from '@/services/storage';

export function CloudBackupSettings() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, updateSettings, refresh, reloadAccountData, restoreFromCloudBackup, syncCloud } =
    useApp();
  const {
    configured,
    session,
    loading,
    signIn,
    signOut,
    requestReady,
    redirectUri,
    reloadClientId,
    reloadSession,
  } = useGoogleDriveAuth();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { settings } = data;
  const storedPhotos = countAppPages(data);
  const devSetup = allowsDevClientIdOverride();
  const inAppBrowserBlocked = useInAppBrowserBlocked();

  const authPreparing = configured && !requestReady;

  const handleConnect = useCallback(async () => {
    setNotice(null);

    if (inAppBrowserBlocked) {
      const message = t('settings.cloudOAuthDisallowedUseragent');
      setNotice(message);
      showMessage(t('settings.cloud'), message);
      return;
    }

    if (!configured) {
      const message = devSetup
        ? t('settings.cloudClientIdRequired')
        : t('settings.cloudComingSoon');
      setNotice(message);
      showMessage(t('settings.cloud'), message);
      return;
    }

    if (authPreparing) {
      setNotice(t('settings.cloudPreparing'));
      return;
    }

    setBusy(true);
    try {
      const connected = await signIn();
      if (connected) {
        cleanGoogleOAuthUrl();
        await reloadSession();
        finishGoogleLogin({ updateSettings, reloadAccountData, syncCloud });
        setNotice(null);
        router.replace('/(tabs)/settings');
        return;
      }

      const existing = await ensureGoogleDriveSession();
      if (existing) {
        cleanGoogleOAuthUrl();
        await reloadSession();
        finishGoogleLogin({ updateSettings, reloadAccountData, syncCloud });
        setNotice(null);
        return;
      }

      setNotice(t('settings.cloudSignInCancelled'));
    } catch (err) {
      const message = googleOAuthErrorMessage(err, t);
      setNotice(message);
      showMessage(t('settings.cloud'), message);
    } finally {
      setBusy(false);
    }
  }, [
    authPreparing,
    configured,
    devSetup,
    inAppBrowserBlocked,
    reloadAccountData,
    reloadSession,
    router,
    signIn,
    syncCloud,
    t,
    updateSettings,
  ]);

  const handleRestoreDrive = useCallback(() => {
    if (!session) {
      showMessage(t('settings.cloud'), t('settings.cloudRestoreFailed'));
      return;
    }
    confirmDestructive({
      title: t('settings.cloudRestoreDrive'),
      message: t('settings.cloudRestoreConfirmDrive'),
      cancelLabel: t('common.cancel'),
      confirmLabel: t('settings.cloudRestoreDrive'),
      onConfirm: async () => {
        setBusy(true);
        try {
          const ok = await restoreFromCloudBackup();
          if (ok) {
            await refresh();
            showMessage(t('settings.cloud'), t('settings.cloudRestoreDriveOk'));
            setNotice(null);
          } else {
            setNotice(t('settings.cloudRestoreFailed'));
          }
        } finally {
          setBusy(false);
        }
      },
    });
  }, [refresh, restoreFromCloudBackup, session, t]);

  const handleDisconnect = useCallback(async () => {
    setBusy(true);
    setNotice(null);
    try {
      await signOut();
      await reloadAccountData();
      updateSettings({ cloudBackupEnabled: false });
      showToast(t('settings.cloudSignOutSuccess'), { title: t('settings.cloud') });
    } finally {
      setBusy(false);
    }
  }, [reloadAccountData, signOut, t, updateSettings]);

  const statusText = (() => {
    if (!configured) {
      return devSetup ? t('settings.cloudNotConfigured') : t('settings.cloudComingSoon');
    }
    if (session) return t('settings.cloudConnected');
    return t('settings.cloudDisconnected');
  })();

  const signInLabel = authPreparing
    ? t('settings.cloudPreparing')
    : t('settings.cloudSignInGoogle');

  const headerBlock = (
    <View style={styles.headerBlock}>
      <View style={styles.headerRow} pointerEvents="box-none">
        <Text style={styles.headerLabel} pointerEvents="none">
          {t('settings.cloud')}
        </Text>
        <Text style={styles.headerStatus} pointerEvents="none" numberOfLines={1}>
          {session?.email ?? statusText}
        </Text>
      </View>

      {!session && configured ? (
        <View style={styles.signInWrap}>
          <GoogleSignInButton
            label={signInLabel}
            onPress={handleConnect}
            disabled={busy || inAppBrowserBlocked}
            loading={busy || authPreparing}
          />
        </View>
      ) : null}

      {session && configured ? (
        <View style={styles.signInWrap}>
          <GoogleSignInButton
            label={busy ? t('settings.cloudSyncing') : t('settings.cloudSignOut')}
            onPress={handleDisconnect}
            disabled={busy}
            loading={busy}
          />
        </View>
      ) : null}

      <GoogleOAuthInAppBrowserBlock />

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      {Platform.OS === 'web' && configured && !inAppBrowserBlocked ? (
        <Text style={styles.webMobileHint}>{t('settings.cloudWebMobileHint')}</Text>
      ) : null}

      {Platform.OS !== 'web' && configured ? (
        <GoogleOAuthMobileGuide redirectUri={redirectUri} />
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.block}>
        <View style={styles.headerRow}>
          <Text style={styles.headerLabel}>{t('settings.cloud')}</Text>
          <ActivityIndicator color={theme.orange} />
        </View>
      </View>
    );
  }

  if (!configured) {
    return (
      <View style={styles.block}>
        {headerBlock}
        {devSetup ? (
          <>
            <GoogleOAuthClientIdForm onSaved={() => void reloadClientId()} />
            <GoogleOAuthSetupGuide />
          </>
        ) : (
          <Text style={styles.hint}>{t('settings.cloudComingSoon')}</Text>
        )}
      </View>
    );
  }

  const syncLabel = formatRelativeSyncTime(settings.lastCloudSyncAt, t);

  return (
    <View style={styles.block}>
      {headerBlock}

      {session ? (
        <>
          <SettingsRow
            label={t('settings.cloudStoredPhotos')}
            value={t('settings.cloudStoredPhotosValue', { count: storedPhotos })}
            last={false}
          />
          <SettingsRow
            label={t('settings.cloudLastSync')}
            value={busy ? t('settings.cloudSyncing') : syncLabel}
            last={false}
          />
          <Pressable
            onPress={busy ? undefined : handleRestoreDrive}
            style={[styles.actionRow, styles.rowBorder]}
            disabled={busy}>
            <Text style={styles.actionText}>{t('settings.cloudRestoreDrive')}</Text>
            {busy && <ActivityIndicator color={theme.orange} />}
          </Pressable>
        </>
      ) : null}

      <Text style={styles.hint}>{t('settings.cloudHint')}</Text>
      {!session ? (
        <Text style={styles.devHint} selectable>
          redirect: {redirectUri}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 0 },
  headerBlock: {
    ...webHairlineBottom,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingHorizontal: 16,
    gap: 12,
    minHeight: 40,
  },
  headerLabel: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.black,
    flexShrink: 0,
  },
  headerStatus: {
    fontSize: theme.font.caption,
    fontWeight: '600',
    color: theme.graySecondary,
    flexShrink: 1,
    textAlign: 'right',
  },
  signInWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    alignItems: 'center',
  },
  notice: {
    marginTop: 10,
    marginHorizontal: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: theme.orangeMuted,
    color: theme.black,
    fontSize: theme.font.caption,
    fontWeight: '600',
    lineHeight: 18,
  },
  hint: {
    fontSize: theme.font.caption,
    color: theme.gray,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    lineHeight: 18,
  },
  webMobileHint: {
    marginTop: 8,
    marginHorizontal: 16,
    fontSize: 11,
    color: theme.grayMuted,
    lineHeight: 16,
  },
  devHint: {
    fontSize: 10,
    color: theme.gray,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 42,
  },
  rowBorder: webHairlineTop,
  actionText: { ...BUTTON_LABEL_DEFAULT, color: theme.orange },
});
