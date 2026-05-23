import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
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
      '<body style="margin:0;font-family:system-ui,sans-serif;background:#F9F8F6;color:#0D0D0D;' +
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
body {
  background-color: #2A2826;
  overflow-x: hidden;
}
`;
