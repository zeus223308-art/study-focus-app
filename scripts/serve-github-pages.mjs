import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.PORT ?? 4173);
const DIST = path.join(process.cwd(), 'dist');
const BASE = '/study-focus-app';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.css': 'text/css; charset=utf-8',
};

function send(res, status, body, type) {
  res.writeHead(status, { 'Content-Type': type });
  res.end(body);
}

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('Missing dist/index.html — run: npx expo export --platform web');
  process.exit(1);
}

createServer((req, res) => {
  const raw = decodeURIComponent((req.url ?? '/').split('?')[0]);
  let url = raw.startsWith(BASE) ? raw.slice(BASE.length) || '/' : raw;
  if (!url.startsWith('/')) url = `/${url}`;

  const rel = url === '/' ? 'index.html' : url.replace(/^\//, '');
  const filePath = path.normalize(path.join(DIST, rel));
  if (!filePath.startsWith(DIST)) {
    send(res, 403, 'Forbidden', 'text/plain');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (!err) {
      send(res, 200, data, MIME[path.extname(filePath)] ?? 'application/octet-stream');
      return;
    }
    fs.readFile(path.join(DIST, 'index.html'), (spaErr, html) => {
      if (spaErr) {
        send(res, 404, 'Not found', 'text/plain');
        return;
      }
      send(res, 200, html, MIME['.html']);
    });
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`GitHub Pages preview: http://127.0.0.1:${PORT}${BASE}/`);
});
