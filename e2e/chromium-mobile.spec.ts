import { expect, test } from '@playwright/test';

import { DASHBOARD_TAB, FILES_TAB, GOOGLE_SIGN_IN, openSettingsTab, waitForMainShell } from './helpers';

test.describe('Mobile Chromium (Android Chrome-class)', () => {
  test('loads main shell after splash', async ({ page }) => {
    await waitForMainShell(page);
    await expect(page.getByText(FILES_TAB)).toBeVisible();
    await expect(page.getByText(DASHBOARD_TAB)).toBeVisible();
  });

  test('settings tab shows Google sign-in', async ({ page }) => {
    await waitForMainShell(page);
    await openSettingsTab(page);
    await expect(page.getByRole('button', { name: GOOGLE_SIGN_IN })).toBeVisible();
  });

  test('login success toast is compact and auto-dismisses', async ({ page }) => {
    await waitForMainShell(page);
    await page.evaluate(() => {
      window.__MS_E2E__?.showToast('Google 로그인되었습니다.');
    });
    const toast = page.getByText('Google 로그인되었습니다.');
    await expect(toast).toBeVisible();
    await expect(toast).not.toBeVisible({ timeout: 4_000 });
  });

  test('tab navigation works on Chromium', async ({ page }) => {
    await waitForMainShell(page);
    await page.getByText(FILES_TAB).click();
    await expect(page.getByText(/파일|Files|vault/i).first()).toBeVisible({ timeout: 10_000 });
    await openSettingsTab(page);
  });
});
