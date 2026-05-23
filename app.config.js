/** @type {import('expo/config').ConfigContext} */
module.exports = ({ config }) => {
  /** GitHub Pages: /repo-name — leave empty for local dev & Vercel root deploy */
  const basePath = (process.env.EXPO_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '');

  return {
    ...config,
    experiments: {
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
