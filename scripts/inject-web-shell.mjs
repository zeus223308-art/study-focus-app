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
body{background-color:#0A0A0A;overflow-x:hidden;touch-action:manipulation;-webkit-touch-callout:none;min-height:100%;min-height:-webkit-fill-available}
#root{display:flex;flex-direction:column;flex:1;min-height:100%;min-height:-webkit-fill-available;overflow-x:hidden}
[data-subject-carousel="scroll"]{touch-action:pan-x!important;-webkit-overflow-scrolling:touch;overflow-x:auto!important;overflow-y:hidden!important}
[data-recall-canvas="1"],[data-hold-drag="active"]{touch-action:none!important;-webkit-user-select:none!important;user-select:none!important}
`.replace(/\n/g, '');

const inject =
  '<script data-legacy-safari-polyfill="1">' +
  polyfill +
  '</script><style data-web-mobile-shell="1">' +
  shellCss +
  '</style>';

for (const rel of ['dist/index.html', 'dist/404.html']) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  let html = fs.readFileSync(file, 'utf8');
  if (!html.includes('data-legacy-safari-polyfill')) {
    html = html.replace('<head>', '<head>' + inject);
  }
  fs.writeFileSync(file, html);
}

console.log('inject-web-shell: legacy Safari polyfill + shell CSS applied');
