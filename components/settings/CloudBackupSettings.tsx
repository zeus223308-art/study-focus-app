import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { GoogleOAuthSetupGuide } from '@/components/settings/GoogleOAuthSetupGuide';
import { GoogleSignInButton } from '@/components/settings/GoogleSignInButton';
import { SettingsRow } from '@/components/SettingsGroup';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useGoogleDriveAuth } from '@/hooks/useGoogleDriveAuth';
import { formatRelativeSyncTime } from '@/lib/cloud/sync-label';
import { showMessage } from '@/lib/ui/confirm';

export function CloudBackupSettings() {
  const { t } = useTranslation();
  const { data, updateSettings, refresh, syncCloud } = useApp();
  const { configured, session, loading, signIn, signOut, requestReady, redirectUri } =
    useGoogleDriveAuth();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { settings } = data;

  const authPreparing = configured && !requestReady;

  const runSync = useCallback(async () => {
    setBusy(true);
    setNotice(null);
    try {
      await syncCloud();
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('settings.cloudSyncError');
      setNotice(message);
      showMessage(t('settings.cloud'), message);
    } finally {
      setBusy(false);
    }
  }, [refresh, syncCloud, t]);

  const handleConnect = useCallback(async () => {
    setNotice(null);

    if (!configured) {
      const message = t('settings.cloudSetupHint');
      setNotice(message);
      showMessage(t('settings.cloud'), message);
      return;
    }

    if (authPreparing) {
      const message = t('settings.cloudPreparing');
      setNotice(message);
      return;
    }

    setBusy(true);
    try {
      const connected = await signIn();
      if (connected) {
        updateSettings({ cloudBackupEnabled: true });
        await refresh();
        setNotice(null);
        return;
      }
      setNotice(t('settings.cloudSignInCancelled'));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('settings.cloudSignInError');
      setNotice(message);
      showMessage(t('settings.cloud'), message);
    } finally {
      setBusy(false);
    }
  }, [authPreparing, configured, refresh, signIn, t, updateSettings]);

  const handleDisconnect = useCallback(async () => {
    setBusy(true);
    setNotice(null);
    try {
      await signOut();
      updateSettings({ cloudBackupEnabled: false });
    } finally {
      setBusy(false);
    }
  }, [signOut, updateSettings]);

  const statusText = (() => {
    if (!configured) return t('settings.cloudNotConfigured');
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

      {!session ? (
        <View style={styles.signInWrap}>
          <GoogleSignInButton
            label={signInLabel}
            onPress={handleConnect}
            disabled={busy}
            loading={busy || authPreparing}
          />
        </View>
      ) : null}

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
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
        <GoogleOAuthSetupGuide />
        <Text style={styles.hint}>{t('settings.cloudSetupHint')}</Text>
        {__DEV__ ? <Text style={styles.devHint}>{t('settings.cloudSetupHintDev')}</Text> : null}
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
            label={t('settings.cloudLastSync')}
            value={syncLabel}
            onPress={busy ? undefined : runSync}
            last={false}
          />
          <Pressable
            onPress={busy ? undefined : runSync}
            style={[styles.actionRow, styles.rowBorder]}
            disabled={busy}>
            <Text style={styles.actionText}>
              {busy ? t('settings.cloudSyncing') : t('settings.cloudSyncNow')}
            </Text>
            {busy && <ActivityIndicator color={theme.orange} />}
          </Pressable>
          <Pressable
            onPress={busy ? undefined : handleDisconnect}
            style={styles.actionRow}
            disabled={busy}>
            <Text style={styles.signOutText}>{t('settings.cloudSignOut')}</Text>
          </Pressable>
        </>
      ) : null}

      <Text style={styles.hint}>{t('settings.cloudHint')}</Text>
      {__DEV__ ? <Text style={styles.devHint}>redirect: {redirectUri}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 0 },
  headerBlock: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.grayLight,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingHorizontal: 16,
    gap: 12,
    minHeight: 44,
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
    paddingTop: 10,
    paddingBottom: 12,
    lineHeight: 18,
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
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.grayLight,
  },
  actionText: { fontSize: theme.font.body, fontWeight: '700', color: theme.orange },
  signOutText: { fontSize: theme.font.body, fontWeight: '600', color: theme.graySecondary },
});
