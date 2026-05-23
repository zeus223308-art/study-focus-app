import type { TFunction } from 'i18next';

export function formatRelativeSyncTime(
  iso: string | null | undefined,
  t: TFunction
): string {
  if (!iso) return t('settings.cloudNeverSynced');
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return t('settings.cloudNeverSynced');
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return t('settings.cloudSyncedJustNow');
  if (minutes < 60) return t('settings.cloudSyncedMinutes', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('settings.cloudSyncedHours', { count: hours });
  const days = Math.floor(hours / 24);
  return t('settings.cloudSyncedDays', { count: days });
}
