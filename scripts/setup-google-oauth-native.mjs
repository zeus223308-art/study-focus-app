#!/usr/bin/env node
/**
 * Registers iOS/Android Google OAuth client IDs in .env and EAS secrets.
 *
 * Usage:
 *   node scripts/setup-google-oauth-native.mjs --open
 *   node scripts/setup-google-oauth-native.mjs --ios ID.apps.googleusercontent.com
 *   node scripts/setup-google-oauth-native.mjs --android ID.apps.googleusercontent.com
 *   node scripts/setup-google-oauth-native.mjs --ios ID --android ID --build ios
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const envPath = join(root, '.env');

const BUNDLE_ID = 'com.memorysherpa.app';
const PACKAGE = 'com.memorysherpa.app';

function parseArgs(argv) {
  const out = { open: false, ios: '', android: '', build: '' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--open') out.open = true;
    else if (a === '--ios' && argv[i + 1]) out.ios = argv[++i].trim();
    else if (a === '--android' && argv[i + 1]) out.android = argv[++i].trim();
    else if (a === '--build' && argv[i + 1]) out.build = argv[++i].trim();
  }
  return out;
}

function isValidId(id) {
  return id.includes('.apps.googleusercontent.com') && id.length > 20;
}

function readEnv() {
  if (!existsSync(envPath)) return {};
  const map = {};
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) map[m[1]] = m[2];
  }
  return map;
}

function writeEnv(map) {
  const lines = [
    '# Google OAuth — local dev + EAS build',
    `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=${map.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? ''}`,
    map.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
      ? `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=${map.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID}`
      : '# EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=',
    map.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
      ? `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=${map.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID}`
      : '# EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=',
    '',
    '# EXPO_PUBLIC_BASE_PATH=/study-focus-app',
    '',
  ];
  writeFileSync(envPath, lines.join('\n'), 'utf8');
  console.log(`Updated ${envPath}`);
}

function openUrl(url) {
  const cmd =
    process.platform === 'win32'
      ? ['cmd', '/c', 'start', '', url]
      : process.platform === 'darwin'
        ? ['open', url]
        : ['xdg-open', url];
  spawnSync(cmd[0], cmd.slice(1), { stdio: 'ignore', shell: false });
}

function easWhoami() {
  const r = spawnSync('npx', ['eas-cli', 'whoami'], {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  return r.status === 0 && r.stdout && !r.stdout.includes('Not logged in');
}

function easSecret(name, value) {
  const r = spawnSync(
    'npx',
    ['eas-cli', 'secret:create', '--name', name, '--value', value, '--scope', 'project', '--force'],
    { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' }
  );
  return r.status === 0;
}

function easBuild(platform) {
  const profile = platform === 'ios' ? 'preview' : 'preview';
  spawnSync(
    'npx',
    ['eas-cli', 'build', '-p', platform, '--profile', profile, '--non-interactive'],
    { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' }
  );
}

const args = parseArgs(process.argv);

if (args.open) {
  console.log(`
Opening Google Cloud (same project as your Web Client ID):

  iOS  — create OAuth client → type iOS → bundle ID: ${BUNDLE_ID}
  Android — create OAuth client → type Android → package: ${PACKAGE} + SHA-1 from EAS

Also open OAuth consent → Test users → add whichone7@gmail.com
`);
  openUrl('https://console.cloud.google.com/apis/credentials/oauthclient');
  openUrl('https://console.cloud.google.com/apis/credentials/consent');
  console.log('After creating clients, run:');
  console.log('  npm run setup:google-native -- --ios YOUR_IOS_ID --android YOUR_ANDROID_ID');
  process.exit(0);
}

if (!args.ios && !args.android) {
  console.error(`
MemorySherpa — native Google OAuth setup

1) Open Console (creates iOS/Android clients):
   npm run setup:google-native -- --open

2) Register IDs (also sets EAS secrets if you ran: npx eas-cli login):
   npm run setup:google-native -- --ios 123-xxx.apps.googleusercontent.com
   npm run setup:google-native -- --ios ID --android ID

3) Optional: trigger cloud build after secrets:
   npm run setup:google-native -- --ios ID --build ios

iOS bundle ID: ${BUNDLE_ID}
Android package: ${PACKAGE}
`);
  process.exit(1);
}

if (args.ios && !isValidId(args.ios)) {
  console.error('Invalid --ios client ID');
  process.exit(1);
}
if (args.android && !isValidId(args.android)) {
  console.error('Invalid --android client ID');
  process.exit(1);
}

const env = readEnv();
if (!env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
  console.warn('Warning: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID missing in .env — run setup:google-oauth first.');
}
if (args.ios) env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = args.ios;
if (args.android) env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID = args.android;
writeEnv(env);

if (easWhoami()) {
  if (args.ios) {
    console.log('Setting EAS secret EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID …');
    easSecret('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID', args.ios);
  }
  if (args.android) {
    console.log('Setting EAS secret EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID …');
    easSecret('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID', args.android);
  }
} else {
  console.warn(`
EAS not logged in — secrets were NOT uploaded to Expo cloud.

Run once in terminal:
  npx eas-cli login

Then re-run:
  npm run setup:google-native -- ${args.ios ? `--ios ${args.ios}` : ''} ${args.android ? `--android ${args.android}` : ''}
`);
}

if (args.build === 'ios' || args.build === 'android') {
  if (!easWhoami()) {
    console.error('Cannot build: run npx eas-cli login first.');
    process.exit(1);
  }
  console.log(`Starting EAS build (${args.build})…`);
  easBuild(args.build);
} else if (args.ios || args.android) {
  console.log(`
Next: rebuild native apps so testers get the new Client IDs:
  npm run build:ios:device
  npm run build:android:apk
`);
}
