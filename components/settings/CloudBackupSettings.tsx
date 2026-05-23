import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { GoogleSignInButton } from '@/components/settings/GoogleSignInButton';
import { SettingsRow } from '@/components/SettingsGroup';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useGoogleDriveAuth } from '@/hooks/useGoogleDriveAuth';
import { formatRelativeSyncTime } from '@/lib/cloud/sync-label';

export function CloudBackupSettings() {
  const { t } = useTranslation();
  const { data, updateSettings, refresh, syncCloud } = useApp();
  const { configured, session, loading, signIn, signOut, requestReady, redirectUri } =
    useGoogleDriveAuth();
  const [busy, setBusy] = useState(false);
  const { settings } = data;

  const runSync = useCallback(async () => {
    setBusy(true);
    try {
      await syncCloud();
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('settings.cloudSyncError');
      Alert.alert(t('settings.cloud'), message);
    } finally {
      setBusy(false);
    }
  }, [refresh, syncCloud, t]);

  const handleConnect = useCallback(async () => {
    if (!configured) {
      Alert.alert(t('settings.cloud'), t('settings.cloudSetupHint'));
      return;
    }
    setBusy(true);
    try {
      const connected = await signIn();
      if (connected) {
        updateSettings({ cloudBackupEnabled: true });
        await refresh();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('settings.cloudSignInError');
      Alert.alert(t('settings.cloud'), message);
    } finally {
      setBusy(false);
    }
  }, [configured, refresh, signIn, t, updateSettings]);

  const handleDisconnect = useCallback(async () => {
    setBusy(true);
    try {
      await signOut();
      updateSettings({ cloudBackupEnabled: false });
    } finally {
      setBusy(false);
    }
  }, [signOut, updateSettings]);

  const statusText = (() => {
    if (!configured) return t('settings.cloudNotConfigured');
    if (session) return session.email ?? t('settings.cloudConnected');
    return t('settings.cloudDisconnected');
  })();

  const headerRow = (
    <View style={styles.headerRow}>
      <Text style={styles.headerLabel}>{t('settings.cloud')}</Text>

      <View style={styles.headerCenter}>
        {!session ? (
          <GoogleSignInButton
            label={t('settings.cloudSignInGoogle')}
            onPress={handleConnect}
            disabled={busy || (configured && !requestReady)}
            loading={busy}
          />
        ) : null}
      </View>

      <Text style={styles.headerStatus} numberOfLines={1}>
        {session ? session.email ?? t('settings.cloudConnected') : statusText}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.block}>
        <View style={styles.headerRow}>
          <Text style={styles.headerLabel}>{t('settings.cloud')}</Text>
          <ActivityIndicator color={theme.orange} style={styles.headerSpinner} />
        </View>
      </View>
    );
  }

  if (!configured) {
    return (
      <View style={styles.block}>
        {headerRow}
        <Text style={styles.hint}>{t('settings.cloudSetupHint')}</Text>
        {__DEV__ ? <Text style={styles.devHint}>{t('settings.cloudSetupHintDev')}</Text> : null}
      </View>
    );
  }

  const syncLabel = formatRelativeSyncTime(settings.lastCloudSyncAt, t);

  return (
    <View style={styles.block}>
      {headerRow}

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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.grayLight,
    minHeight: 56,
  },
  headerLabel: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.black,
    flexShrink: 0,
    maxWidth: '28%',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  headerStatus: {
    fontSize: theme.font.caption,
    fontWeight: '600',
    color: theme.graySecondary,
    flexShrink: 1,
    maxWidth: '34%',
    textAlign: 'right',
  },
  headerSpinner: { marginLeft: 'auto' },
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
