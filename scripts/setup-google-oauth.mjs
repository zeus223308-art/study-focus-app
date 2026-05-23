#!/usr/bin/env node
/**
 * Writes .env and sets GitHub Actions secret for Google OAuth.
 *
 * Usage:
 *   node scripts/setup-google-oauth.mjs YOUR_CLIENT_ID.apps.googleusercontent.com
 *   npm run setup:google-oauth -- YOUR_CLIENT_ID.apps.googleusercontent.com
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const envPath = join(root, '.env');

const clientId = process.argv[2]?.trim();

if (!clientId || !clientId.includes('.apps.googleusercontent.com')) {
  console.error(`
MemorySherpa — Google OAuth setup

1) Open Google Cloud Console → Credentials → Create OAuth client (Web):
   https://console.cloud.google.com/apis/credentials/oauthclient

2) Enable Google Drive API:
   https://console.cloud.google.com/apis/library/drive.googleapis.com

3) Register these JavaScript origins:
   - https://zeus223308-art.github.io
   - http://localhost:8081
   - http://localhost:4173

4) Register these redirect URIs:
   - https://zeus223308-art.github.io/study-focus-app
   - https://zeus223308-art.github.io/study-focus-app/
   - http://localhost:8081
   - http://localhost:4173
   - http://localhost:4173/study-focus-app
   - http://localhost:4173/study-focus-app/

5) Run again with your Web client ID:
   npm run setup:google-oauth -- 123456789-xxxx.apps.googleusercontent.com
`);
  process.exit(1);
}

const envLines = [
  '# Google OAuth (Web client) — local dev + export:web',
  `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=${clientId}`,
  '',
  '# GitHub Pages subpath (optional local test)',
  '# EXPO_PUBLIC_BASE_PATH=/study-focus-app',
  '',
];

writeFileSync(envPath, envLines.join('\n'), 'utf8');
console.log(`Wrote ${envPath}`);

const gh = spawnSync('gh', ['secret', 'set', 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID', '--body', clientId], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (gh.status === 0) {
  console.log('GitHub secret EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID set.');
  console.log('Push to main (or re-run Deploy Web workflow) to update GitHub Pages.');
} else {
  console.warn('Could not set GitHub secret via gh CLI. Add it manually in repo Settings → Secrets.');
}

console.log(`
Next:
  npm run web
  # or redeploy: git commit --allow-empty -m "chore: redeploy with Google OAuth" && git push
`);
