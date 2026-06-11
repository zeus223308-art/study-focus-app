import { expect, type Page } from '@playwright/test';

const SETTINGS_TAB = /^(설정|Settings)$/;
const FILES_TAB = /^(파일|Files)$/;
const DASHBOARD_TAB = /^(대시보드|Dashboard)$/;

/** Skip splash + wait for dock tabs (Playwright WebKit). */
export async function waitForMainShell(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('MS_E2E', '1');
  });
  await page.goto('/?e2e=1');
  await expect(page.getByText(SETTINGS_TAB)).toBeVisible({ timeout: 30_000 });
}

const GOOGLE_SIGN_IN = /Google (로그인|Sign in)/;

export async function openSettingsTab(page: Page) {
  await page.getByText(SETTINGS_TAB).click();
  await expect(page.getByRole('button', { name: GOOGLE_SIGN_IN })).toBeVisible({ timeout: 15_000 });
}

export { FILES_TAB, DASHBOARD_TAB, SETTINGS_TAB, GOOGLE_SIGN_IN };
