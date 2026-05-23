import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

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
  }, [refresh, signIn, t]);

  const handleDisconnect = useCallback(async () => {
    setBusy(true);
    try {
      await signOut();
      updateSettings({ cloudBackupEnabled: false });
    } finally {
      setBusy(false);
    }
  }, [signOut, updateSettings]);

  if (loading) {
    return (
      <SettingsRow
        label={t('settings.cloud')}
        right={<ActivityIndicator color={theme.orange} />}
        last={false}
      />
    );
  }

  if (!configured) {
    return (
      <View style={styles.block}>
        <SettingsRow
          label={t('settings.cloud')}
          value={t('settings.cloudNotConfigured')}
          last={false}
        />
        <View style={[styles.actionRow, styles.connectRow, styles.connectRowDisabled]}>
          <Text style={styles.connectTextDisabled}>{t('settings.cloudConnect')}</Text>
        </View>
        <Text style={styles.hint}>{t('settings.cloudSetupHint')}</Text>
        {__DEV__ ? <Text style={styles.devHint}>{t('settings.cloudSetupHintDev')}</Text> : null}
      </View>
    );
  }

  const syncLabel = formatRelativeSyncTime(settings.lastCloudSyncAt, t);

  return (
    <View style={styles.block}>
      <SettingsRow
        label={t('settings.cloud')}
        value={
          session
            ? session.email ?? t('settings.cloudConnected')
            : t('settings.cloudDisconnected')
        }
        last={false}
      />

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
      ) : (
        <Pressable
          onPress={busy || !requestReady ? undefined : handleConnect}
          style={[styles.actionRow, styles.connectRow]}
          disabled={busy || !requestReady}>
          <Text style={styles.connectText}>{t('settings.cloudConnect')}</Text>
          {busy && <ActivityIndicator color={theme.white} />}
        </Pressable>
      )}

      <Text style={styles.hint}>{t('settings.cloudHint')}</Text>
      {__DEV__ ? <Text style={styles.devHint}>redirect: {redirectUri}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 0 },
  hint: {
    fontSize: theme.font.caption,
    color: theme.gray,
    fontWeight: '600',
    paddingHorizontal: 16,
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
  connectRow: {
    backgroundColor: theme.orange,
    marginHorizontal: 12,
    marginTop: 4,
    borderRadius: 10,
    justifyContent: 'center',
    gap: 8,
  },
  connectRowDisabled: {
    backgroundColor: theme.grayLight,
    opacity: 0.85,
  },
  connectText: { fontSize: theme.font.body, fontWeight: '700', color: theme.white },
  connectTextDisabled: {
    fontSize: theme.font.body,
    fontWeight: '700',
    color: theme.graySecondary,
    textAlign: 'center',
  },
  signOutText: { fontSize: theme.font.body, fontWeight: '600', color: theme.graySecondary },
});
