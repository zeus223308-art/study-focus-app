import { test } from '@playwright/test';

import { openParityBrowsers } from './parity-browsers';
import { assertMobileParity, collectParitySnapshot } from './parity-layout';

const APP_BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173/study-focus-app';

type ScreenCase = {
  name: string;
  path: string;
  ready: RegExp;
};

const SCREENS: ScreenCase[] = [
  { name: 'dashboard', path: '/?e2e=1', ready: /복습할 사진 없음|월간 달력/ },
  { name: 'vault', path: '/vault?e2e=1', ready: /수학|폴더 추가/ },
  { name: 'settings', path: '/settings?e2e=1', ready: /Google 로그인|복습 패턴/ },
  { name: 'capture', path: '/capture?e2e=1', ready: /촬영|가져오기|카메라/ },
  { name: 'search', path: '/search?e2e=1', ready: /검색|Search/ },
  { name: 'folder', path: '/folder/folder_math?e2e=1', ready: /수학/ },
  { name: 'trash', path: '/trash?e2e=1', ready: /휴지통|삭제/ },
];

test.describe.configure({ mode: 'serial' });

test.describe('Android Chrome vs iOS Safari layout parity', () => {
  for (const screen of SCREENS) {
    test(`${screen.name} matches Chrome baseline`, async () => {
      const { chromePage, webkitPage, dispose } = await openParityBrowsers(APP_BASE);

      try {
        await chromePage.goto(screen.path);
        await chromePage.getByText(screen.ready).first().waitFor({ timeout: 30_000 });

        await webkitPage.goto(screen.path);
        await webkitPage.getByText(screen.ready).first().waitFor({ timeout: 30_000 });

        const chromeSnap = await collectParitySnapshot(chromePage, screen.path);
        const webkitSnap = await collectParitySnapshot(webkitPage, screen.path);

        assertMobileParity(screen.name, chromeSnap, webkitSnap);
      } finally {
        await dispose();
      }
    });
  }

  test('settings scroll region matches after opening review pattern help', async () => {
    const { chromePage, webkitPage, dispose } = await openParityBrowsers(APP_BASE);

    try {
      const path = '/settings?e2e=1';
      await chromePage.goto(path);
      await chromePage.getByText(/Google 로그인/).first().waitFor({ timeout: 30_000 });
      await webkitPage.goto(path);
      await webkitPage.getByText(/Google 로그인/).first().waitFor({ timeout: 30_000 });

      const help = /도움말|Help|패턴/;
      const chromeHelp = chromePage.getByRole('button', { name: help }).first();
      const webkitHelp = webkitPage.getByRole('button', { name: help }).first();
      if (await chromeHelp.isVisible().catch(() => false)) {
        await chromeHelp.click();
        await webkitHelp.click();
        await chromePage.getByText(/1-3-7-14-30|간격/).first().waitFor({ timeout: 10_000 });
        await webkitPage.getByText(/1-3-7-14-30|간격/).first().waitFor({ timeout: 10_000 });

        const chromeSnap = await collectParitySnapshot(chromePage, `${path}#pattern-help`);
        const webkitSnap = await collectParitySnapshot(webkitPage, `${path}#pattern-help`);
        assertMobileParity('settings-pattern-help', chromeSnap, webkitSnap);
      }
    } finally {
      await dispose();
    }
  });

  test('vault trash section matches when expanded', async () => {
    const { chromePage, webkitPage, dispose } = await openParityBrowsers(APP_BASE);

    try {
      const path = '/vault?e2e=1';
      await chromePage.goto(path);
      await chromePage.getByText(/수학/).first().waitFor({ timeout: 30_000 });
      await webkitPage.goto(path);
      await webkitPage.getByText(/수학/).first().waitFor({ timeout: 30_000 });

      const trashToggle = /휴지통|삭제된/;
      const chromeTrash = chromePage.getByText(trashToggle).first();
      const webkitTrash = webkitPage.getByText(trashToggle).first();
      if (await chromeTrash.isVisible().catch(() => false)) {
        await chromeTrash.click();
        await webkitTrash.click();
        await chromePage.waitForTimeout(500);
        await webkitPage.waitForTimeout(500);

        const chromeSnap = await collectParitySnapshot(chromePage, `${path}#trash`);
        const webkitSnap = await collectParitySnapshot(webkitPage, `${path}#trash`);
        assertMobileParity('vault-trash', chromeSnap, webkitSnap);
      }
    } finally {
      await dispose();
    }
  });
});
