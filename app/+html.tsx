import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          httpEquiv="Cache-Control"
          content="no-cache, no-store, must-revalidate"
        />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#0A0A0A" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="MemorySherpa" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="color-scheme" content="light" />
        <ScrollViewStyleReset />
        <script
          dangerouslySetInnerHTML={{
            __html: legacySafariPolyfillScript,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: oauthPopupCloseScript,
          }}
        />
        <style dangerouslySetInnerHTML={{ __html: webMobileShellCss }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const legacySafariPolyfillScript = `
(function () {
  var g = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this;
  if (typeof g.globalThis === 'undefined') g.globalThis = g;

  if (typeof Object.hasOwn !== 'function') {
    Object.hasOwn = function (obj, prop) {
      return Object.prototype.hasOwnProperty.call(obj, prop);
    };
  }

  if (typeof g.structuredClone !== 'function') {
    g.structuredClone = function (val) {
      if (val === undefined) return val;
      if (typeof val === 'function') return val;
      return JSON.parse(JSON.stringify(val));
    };
  }

  if (!Array.prototype.at) {
    Array.prototype.at = function (n) {
      var len = this.length;
      var i = Math.trunc(Number(n)) || 0;
      if (i < 0) i += len;
      return i < 0 || i >= len ? undefined : this[i];
    };
  }

  if (!String.prototype.at) {
    String.prototype.at = function (n) {
      var len = this.length;
      var i = Math.trunc(Number(n)) || 0;
      if (i < 0) i += len;
      return i < 0 || i >= len ? undefined : this[i];
    };
  }

  if (typeof Promise.withResolvers !== 'function') {
    Promise.withResolvers = function () {
      var resolve, reject;
      var promise = new Promise(function (res, rej) {
        resolve = res;
        reject = rej;
      });
      return { promise: promise, resolve: resolve, reject: reject };
    };
  }
})();
`;

const oauthPopupCloseScript = `
(function () {
  try {
    if (!window.opener) return;
    var hash = window.location.hash || '';
    var search = window.location.search || '';
    var isOAuthReturn =
      hash.indexOf('access_token=') !== -1 ||
      hash.indexOf('error=') !== -1 ||
      hash.indexOf('state=') !== -1;
    if (!isOAuthReturn) return;
    var handle = window.localStorage.getItem('ExpoWebBrowserRedirectHandle');
    if (!handle) return;
    var url = window.location.href;
    window.localStorage.setItem('ExpoWebBrowser_OriginUrl_' + handle, url);
    window.opener.postMessage({ url: url, expoSender: handle }, window.location.origin);
    document.open();
    document.write(
      '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>MemorySherpa</title></head>' +
      '<body style="margin:0;font-family:system-ui,sans-serif;background:#141414;color:#F0EDE8;' +
      'display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;padding:24px">' +
      '<p>로그인 완료.<br>잠시 후 창이 닫힙니다.</p></body></html>'
    );
    document.close();
    window.setTimeout(function () { window.close(); }, 120);
  } catch (e) {}
})();
`;

const webMobileShellCss = `
html, body, #root {
  height: 100%;
  margin: 0;
  padding: 0;
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;
}
html {
  color-scheme: light;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}
body {
  background-color: #0A0A0A;
  overflow-x: hidden;
  box-sizing: border-box;
  touch-action: manipulation;
  -webkit-touch-callout: none;
  overscroll-behavior-x: none;
  forced-color-adjust: none;
  min-height: 100%;
  min-height: 100dvh;
  min-height: -webkit-fill-available;
}
#root {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 100%;
  min-height: 100dvh;
  min-height: -webkit-fill-available;
  overflow-x: hidden;
}
@media (prefers-color-scheme: dark) {
  html {
    color-scheme: light;
  }
}
@media (orientation: landscape) {
  html, body, #root {
    width: 100%;
    min-height: 100%;
  }
}
/* Vault subject strip — horizontal swipe between cards */
[data-subject-carousel="scroll"] {
  touch-action: pan-x !important;
  -webkit-overflow-scrolling: touch;
  overflow-x: auto !important;
  overflow-y: hidden !important;
}
[data-subject-carousel="reorder"] {
  touch-action: none !important;
}
[data-hold-drag="active"] {
  touch-action: none !important;
  -webkit-user-select: none !important;
  user-select: none !important;
}
[data-vault-tile="1"] {
  touch-action: manipulation;
  -webkit-touch-callout: none;
}
[data-vault-tile="1"][data-hold-drag="active"] {
  touch-action: none !important;
}
/* Pen ink — prevent mobile web dark-mode inversion of pure black/white */
[data-ink-swatch="pen-black"] {
  background-color: #000000 !important;
  forced-color-adjust: none !important;
}
[data-ink-swatch="pen-white"] {
  border-color: #666666 !important;
  forced-color-adjust: none !important;
}
[data-ink-canvas="1"] canvas {
  forced-color-adjust: none !important;
}
[data-recall-canvas="1"] {
  touch-action: none !important;
  -webkit-user-select: none !important;
  user-select: none !important;
}
/* Folder photo long-press actions + drag subject dock — compact pills on mobile web */
[data-folder-action-bar="1"] {
  width: auto !important;
  max-width: 100% !important;
  margin-left: auto !important;
  margin-right: auto !important;
}
[data-folder-action-bar="1"] [data-folder-action-btn="1"] {
  width: auto !important;
  max-width: 148px !important;
  min-width: 0 !important;
  padding-left: 10px !important;
  padding-right: 10px !important;
  box-sizing: border-box !important;
  flex-shrink: 1 !important;
}
[data-subject-drop-dock="1"] [data-subject-drop-target="1"] {
  min-width: 0 !important;
  max-width: 148px !important;
  padding-left: 10px !important;
  padding-right: 10px !important;
  box-sizing: border-box !important;
}
`;
