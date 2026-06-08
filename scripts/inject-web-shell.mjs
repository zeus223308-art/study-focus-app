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

const bootScript = `(function(){
  var msgEl=null;
  function msg(t){if(!msgEl)msgEl=document.getElementById("ms-boot-msg");if(msgEl)msgEl.textContent=t;}
  function dismiss(){var el=document.getElementById("ms-boot");if(el)el.remove();}
  function rootHasContent(){var r=document.getElementById("root");return !!(r&&r.childNodes&&r.childNodes.length);}
  window.__MS_DISMISS_BOOT=dismiss;
  window.addEventListener("error",function(e){
    var m=(e&&e.message)||"Unknown error";
    msg("Unable to start: "+String(m).slice(0,120));
  });
  window.addEventListener("unhandledrejection",function(e){
    var r=e&&e.reason;
    var m=(r&&r.message)||String(r||"");
    msg("Unable to start: "+String(m).slice(0,120));
  });
  var t0=Date.now();
  var timers=[3000,8000,15000,30000,60000,120000];
  var hints=[
    "Loading app…",
    "Downloading… (first open can be slow)",
    "Still loading… iPhone 7 may need up to 2 minutes",
    "Processing… please wait",
    "Almost there… do not close Safari",
    "Still working… tap below if nothing happens"
  ];
  timers.forEach(function(ms,i){
    setTimeout(function(){
      if(!document.getElementById("ms-boot"))return;
      if(rootHasContent()||window.__MS_ROOT_LAYOUT)return;
      msg(hints[i]||hints[hints.length-1]);
    },ms);
  });
  setTimeout(function(){
    if(!document.getElementById("ms-boot"))return;
    if(rootHasContent()||window.__MS_ROOT_LAYOUT)return;
    var btn=document.getElementById("ms-boot-retry");
    if(btn)btn.style.display="inline-block";
  },120000);
  var poll=setInterval(function(){
    if(rootHasContent()||window.__MS_ROOT_LAYOUT){clearInterval(poll);dismiss();}
  },400);
  setTimeout(function(){clearInterval(poll);},180000);
  window.__MS_BOOT_T0=t0;
})();`;

const bootOverlay =
  '<div id="ms-boot" style="position:fixed;inset:0;z-index:2147483647;background:#F9F8F6;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:-apple-system,system-ui,sans-serif;color:#1a1a1a;text-align:center;padding:24px">' +
  '<div style="font-size:18px;font-weight:700;margin-bottom:8px">MemorySherpa</div>' +
  '<div id="ms-boot-msg" style="font-size:14px;color:#666;line-height:1.5;max-width:280px">Loading app…</div>' +
  '<button id="ms-boot-retry" type="button" style="display:none;margin-top:20px;padding:12px 20px;font-size:15px;font-weight:600;border:none;border-radius:10px;background:#FF6B00;color:#fff" onclick="location.reload()">Refresh</button>' +
  '</div>' +
  '<script data-ms-boot="1">' +
  bootScript +
  '</script>';

const scriptLoader = `(function(){
  var scripts=document.querySelectorAll("script[src][defer]");
  if(!scripts.length)return;
  var el=scripts[scripts.length-1];
  var src=el.getAttribute("src");
  if(!src||el.getAttribute("data-ms-wrapped"))return;
  el.parentNode.removeChild(el);
  var s=document.createElement("script");
  s.src=src;
  s.defer=true;
  s.setAttribute("data-ms-wrapped","1");
  s.onerror=function(){
    var m=document.getElementById("ms-boot-msg");
    if(m)m.textContent="Failed to download app. Check connection and refresh.";
  };
  s.onload=function(){
    window.__MS_SCRIPT_LOADED=Date.now();
    var m=document.getElementById("ms-boot-msg");
    if(m&&!window.__MS_ROOT_LAYOUT&&!document.getElementById("root").childNodes.length){
      m.textContent="Starting… (iPhone 7: up to 2 min)";
    }
  };
  document.body.appendChild(s);
})();`;

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
  if (!html.includes('data-ms-wrapped') && html.includes('_expo/static/js/web/')) {
    html = html.replace('</body>', '<script data-ms-script-loader="1">' + scriptLoader + '</script></body>');
  }
  fs.writeFileSync(file, html);
}

console.log('inject-web-shell: legacy Safari polyfill + shell CSS + boot overlay applied');
