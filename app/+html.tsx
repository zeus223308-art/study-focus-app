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
        <meta name="color-scheme" content="light" />
        <ScrollViewStyleReset />
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
}
html {
  color-scheme: light;
}
body {
  background-color: #0A0A0A;
  overflow-x: hidden;
  touch-action: manipulation;
  -webkit-touch-callout: none;
  forced-color-adjust: none;
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
`;
