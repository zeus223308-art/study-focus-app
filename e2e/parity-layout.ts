import { expect, type Page } from '@playwright/test';

export const MOBILE_VIEWPORT = { width: 390, height: 844 };

export type LayoutBox = {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type ParitySnapshot = {
  path: string;
  viewport: { w: number; h: number };
  text: string;
  buttons: LayoutBox[];
  scrollH: number;
};

function normText(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

/** Collect visible text + interactive layout for Chrome vs WebKit comparison. */
export async function collectParitySnapshot(page: Page, path: string): Promise<ParitySnapshot> {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);

  return page.evaluate((routePath) => {
    const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
    const round = (n: number) => Math.round(n * 10) / 10;

    const buttons: LayoutBox[] = [];
    for (const el of Array.from(document.querySelectorAll('[role="button"], button'))) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const label = norm(el.getAttribute('aria-label') || el.textContent || '');
      if (!label) continue;
      buttons.push({
        label,
        x: round(r.x),
        y: round(r.y),
        w: round(r.width),
        h: round(r.height),
      });
    }

    buttons.sort((a, b) => a.label.localeCompare(b.label) || a.y - b.y);

    return {
      path: routePath,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      text: norm(document.body.innerText),
      buttons,
      scrollH: document.documentElement.scrollHeight,
    };
  }, path);
}

const POSITION_TOLERANCE = 5;

function boxDelta(a: LayoutBox, b: LayoutBox) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.w - b.w), Math.abs(a.h - b.h));
}

/** Assert WebKit (Safari-class) matches Android Chrome baseline. */
export function assertMobileParity(
  screen: string,
  chrome: ParitySnapshot,
  webkit: ParitySnapshot
): void {
  expect(webkit.viewport, `${screen}: viewport`).toEqual(chrome.viewport);

  if (webkit.text !== chrome.text) {
    const chromeLines = chrome.text.split(' ').filter(Boolean);
    const webkitLines = webkit.text.split(' ').filter(Boolean);
    const onlyChrome = chromeLines.filter((w) => !webkit.text.includes(w)).slice(0, 8);
    const onlyWebkit = webkitLines.filter((w) => !chrome.text.includes(w)).slice(0, 8);
    throw new Error(
      `${screen}: body text mismatch\n  chrome-only: ${onlyChrome.join(', ')}\n  webkit-only: ${onlyWebkit.join(', ')}`
    );
  }

  const chromeByLabel = new Map(chrome.buttons.map((b) => [b.label, b]));
  for (const wb of webkit.buttons) {
    const cb = chromeByLabel.get(wb.label);
    if (!cb) continue;
    const delta = boxDelta(cb, wb);
    expect(delta, `${screen}: "${wb.label}" layout`).toBeLessThanOrEqual(POSITION_TOLERANCE);
  }

  for (const cb of chrome.buttons) {
    const wb = webkit.buttons.find((b) => b.label === cb.label);
    expect(wb, `${screen}: missing WebKit control "${cb.label}"`).toBeTruthy();
  }

  expect(Math.abs(webkit.scrollH - chrome.scrollH), `${screen}: scroll height`).toBeLessThanOrEqual(12);
}
