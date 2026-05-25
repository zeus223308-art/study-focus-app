/** Google OAuth blocks embedded / in-app browsers (403 disallowed_useragent). */
export function isInAppOrEmbeddedBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';

  if (/FBAN|FBAV|Instagram|Line\/|KAKAOTALK|Snapchat|Twitter|MicroMessenger|wv\)/i.test(ua)) {
    return true;
  }

  // iOS WebView: AppleWebKit without Safari
  if (/(iPhone|iPod|iPad).*AppleWebKit/i.test(ua) && !/Safari/i.test(ua)) {
    return true;
  }

  // Android WebView
  if (/Android/i.test(ua) && /Version\/[\d.]+/i.test(ua) && !/Chrome\/[\d.]+ Mobile/i.test(ua)) {
    return /; wv\)|WebView/i.test(ua);
  }

  return false;
}

export const MEMORYSHERPA_WEB_APP_URL = 'https://zeus223308-art.github.io/study-focus-app/';
