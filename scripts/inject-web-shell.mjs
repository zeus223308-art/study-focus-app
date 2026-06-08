/**
 * Expo static export omits app/+html.tsx — inject legacy Safari polyfill + mobile shell CSS.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const polyfill = fs.readFileSync(
  path.join(root, 'lib/polyfills/legacy-safari-inline.js'),
  'utf8'
);

const shellCss = `
html,body,#root{height:100%;margin:0;padding:0;width:100%;max-width:100%;overflow-x:hidden;box-sizing:border-box}
html{color-scheme:light;-webkit-text-size-adjust:100%;text-size-adjust:100%}
body{background-color:#F9F8F6;overflow-x:hidden;touch-action:manipulation;-webkit-touch-callout:none;min-height:100%;min-height:-webkit-fill-available}
#root{display:flex;flex-direction:column;flex:1;min-height:100%;min-height:-webkit-fill-available;overflow-x:hidden}
[data-subject-carousel="scroll"]{touch-action:pan-x!important;-webkit-overflow-scrolling:touch;overflow-x:auto!important;overflow-y:hidden!important}
[data-recall-canvas="1"],[data-hold-drag="active"]{touch-action:none!important;-webkit-user-select:none!important;user-select:none!important}
`.replace(/\n/g, '');

const headInject =
  '<script data-legacy-safari-polyfill="1">' +
  polyfill +
  '</script><script data-ms-base-path="1">(function(){try{var p=location.pathname||"";if(p.indexOf("/study-focus-app")!==0){location.replace("/study-focus-app/"+(location.search||"")+(location.hash||""));}}catch(e){}})();</script><style data-web-mobile-shell="1">' +
  shellCss +
  '</style>';

const bootOverlay =
  '<div id="ms-boot" style="position:fixed;inset:0;z-index:2147483647;background:#F9F8F6;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:-apple-system,system-ui,sans-serif;color:#1a1a1a;text-align:center;padding:24px">' +
  '<div style="font-size:18px;font-weight:700;margin-bottom:8px">MemorySherpa</div>' +
  '<div id="ms-boot-msg" style="font-size:14px;color:#666;line-height:1.5">Loading…</div></div>' +
  '<script data-ms-boot="1">(function(){window.addEventListener("error",function(){var m=document.getElementById("ms-boot-msg");if(m)m.textContent="Unable to start. Please refresh Safari.";});setTimeout(function(){var r=document.getElementById("root");if(!document.getElementById("ms-boot"))return;if(r&&r.childNodes.length===0){var m=document.getElementById("ms-boot-msg");if(m)m.textContent="Still loading… first open on iPhone 7 may take up to a minute.";}},15000);})();</script>';

for (const rel of ['dist/index.html', 'dist/404.html']) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  let html = fs.readFileSync(file, 'utf8');
  if (!html.includes('data-legacy-safari-polyfill')) {
    html = html.replace('<head>', '<head>' + headInject);
  }
  if (!html.includes('id="ms-boot"')) {
    html = html.replace('<body>', '<body>' + bootOverlay);
  }
  fs.writeFileSync(file, html);
}

console.log('inject-web-shell: legacy Safari polyfill + shell CSS + boot overlay applied');
