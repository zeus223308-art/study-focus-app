import { chromium, webkit, type Browser, type BrowserContext, type Page } from '@playwright/test';

import { MOBILE_VIEWPORT } from './parity-layout';

const APP_DATA_KEY = '@memory_sherpa_v4__guest';

/** Minimal seeded app state — default subjects, Korean UI, onboarding done. */
function buildSeedPayload(): string {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const createdAt = today.toISOString();

  const data = {
    version: 4,
    subjects: [
      { id: 'folder_math', name: '수학', reviewScheduleId: 'sched_135714', color: '#FF6B00', sortOrder: 0, createdAt },
      { id: 'folder_english', name: '영어', reviewScheduleId: 'sched_135714', color: '#4A90D9', sortOrder: 1, createdAt },
      { id: 'folder_science', name: '과학', reviewScheduleId: 'sched_daily', color: '#50C878', sortOrder: 2, createdAt },
      { id: 'folder_korean', name: '국어', reviewScheduleId: 'sched_daily', color: '#E85D75', sortOrder: 3, createdAt },
    ],
    schedules: [
      {
        id: 'sched_135714',
        name: '1-3-7-14-30',
        nameEn: '1-3-7-14-30',
        mode: 'customIntervals',
        customIntervals: [1, 3, 7, 14, 30],
        tier: 'standard',
      },
      {
        id: 'sched_daily',
        name: '매일',
        nameEn: 'Daily',
        mode: 'everyNDays',
        everyNDays: 1,
        tier: 'standard',
      },
      {
        id: 'sched_2days',
        name: '+추가',
        nameEn: '+ Add',
        mode: 'customIntervals',
        customIntervals: [],
        tier: 'premium',
      },
    ],
    bundles: [],
    trash: [],
    settings: {
      language: 'ko',
      tier: 'free',
      notificationsEnabled: false,
      notificationHour: 9,
      notificationMinute: 0,
      onboardingDone: true,
      firstLaunchDate: todayKey,
      photoLimit: 30,
      memoLimit: 30,
      activeScheduleIds: ['sched_135714', 'sched_daily'],
      defaultSlideshowSeconds: 10,
      cloudBackupEnabled: true,
      lastCloudSyncAt: null,
      hadStudyContent: false,
      lastSavedPageCount: 0,
      lastSavedAt: null,
      lastAppVersion: null,
      lastAutoRecoveryAt: null,
      cloudAccountEmail: null,
      assetQualityVersion: 1,
      captureFrameAspect: '4:3',
    },
  };

  return JSON.stringify(data);
}

async function createMobileContext(browser: Browser, baseURL: string): Promise<BrowserContext> {
  const seed = buildSeedPayload();
  const context = await browser.newContext({
    baseURL,
    viewport: MOBILE_VIEWPORT,
    isMobile: true,
    hasTouch: true,
    locale: 'ko-KR',
    userAgent:
      browser.browserType().name() === 'webkit'
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
        : 'Mozilla/5.0 (Linux; Android 13; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  });

  await context.addInitScript(
    ({ key, json }) => {
      window.localStorage.setItem('MS_E2E', '1');
      window.localStorage.setItem(key, json);
    },
    { key: APP_DATA_KEY, json: seed }
  );

  return context;
}

export type ParityBrowsers = {
  chromePage: Page;
  webkitPage: Page;
  dispose: () => Promise<void>;
};

export async function openParityBrowsers(baseURL: string): Promise<ParityBrowsers> {
  const chromeBrowser = await chromium.launch();
  const webkitBrowser = await webkit.launch();

  const chromeContext = await createMobileContext(chromeBrowser, baseURL);
  const webkitContext = await createMobileContext(webkitBrowser, baseURL);

  const chromePage = await chromeContext.newPage();
  const webkitPage = await webkitContext.newPage();

  return {
    chromePage,
    webkitPage,
    dispose: async () => {
      await chromeContext.close();
      await webkitContext.close();
      await chromeBrowser.close();
      await webkitBrowser.close();
    },
  };
}
