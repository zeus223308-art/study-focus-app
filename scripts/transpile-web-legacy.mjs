/**
 * Down-level Expo web bundles for iOS 12–15 Safari (class fields, etc.).
 */
import { transformFileSync } from '@babel/core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const webDir = path.join(root, 'dist/_expo/static/js/web');

if (!fs.existsSync(webDir)) {
  console.warn('transpile-web-legacy: no dist web bundle — skip');
  process.exit(0);
}

const targets = { ios: '12', safari: '12' };
const files = fs.readdirSync(webDir).filter((f) => f.endsWith('.js'));

for (const file of files) {
  const abs = path.join(webDir, file);
  const src = fs.readFileSync(abs, 'utf8');
  const { code } = transformFileSync(abs, {
    babelrc: false,
    configFile: false,
    compact: true,
    comments: false,
    presets: [
      [
        '@babel/preset-env',
        {
          targets,
          bugfixes: true,
          modules: false,
        },
      ],
    ],
  });
  if (!code || code.length < 1000) {
    throw new Error(`transpile-web-legacy: empty output for ${file}`);
  }
  fs.writeFileSync(abs, code);
  console.log(`transpile-web-legacy: ${file} ${src.length} → ${code.length}`);
}

console.log('transpile-web-legacy: done');
