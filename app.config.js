function googleIosReversedClientScheme(clientId) {
  if (!clientId || !clientId.includes('.apps.googleusercontent.com') || clientId.length <= 20) {
    return null;
  }
  const prefix = clientId.replace(/\.apps\.googleusercontent\.com$/i, '');
  return `com.googleusercontent.apps.${prefix}`;
}

/** @type {import('expo/config').ConfigContext} */
module.exports = ({ config }) => {
  /** GitHub Pages: /repo-name — leave empty for local dev & Vercel root deploy */
  const basePath = (process.env.EXPO_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '');

  const baseScheme = config.scheme ?? 'memorysherpa';
  const schemes = new Set([typeof baseScheme === 'string' ? baseScheme : baseScheme[0]]);
  const iosScheme = googleIosReversedClientScheme(
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? ''
  );
  if (iosScheme) schemes.add(iosScheme);

  return {
    ...config,
    scheme: schemes.size === 1 ? [...schemes][0] : [...schemes],    experiments: {
      ...config.experiments,
      baseUrl: basePath,
    },
    plugins: [...(config.plugins ?? []), 'expo-web-browser'],
    web: {
      bundler: 'metro',
      output: 'single',
      favicon: './assets/images/icon.png',
      name: 'MemorySherpa',
      shortName: 'MemorySherpa',
      description: '암기·복습 플래시카드 앱 — 웹에서 미리보기',
      themeColor: '#F9F8F6',
      backgroundColor: '#2A2826',
    },
  };
};
