import type { AppSettings } from '@/lib/domain/types';

type FinishGoogleLoginArgs = {
  updateSettings: (patch: Partial<AppSettings>) => void;
  reloadAccountData: (options?: { deferCloudSync?: boolean }) => Promise<void>;
  syncCloud: () => Promise<void>;
};

/** Show connected state immediately; load account data and Drive sync in background. */
export function finishGoogleLogin({
  updateSettings,
  reloadAccountData,
  syncCloud,
}: FinishGoogleLoginArgs): void {
  updateSettings({ cloudBackupEnabled: true });
  void (async () => {
    await reloadAccountData({ deferCloudSync: true });
    try {
      await syncCloud();
    } catch {
      /* CloudAutoSync retries on interval */
    }
  })();
}
