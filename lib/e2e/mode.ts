/** Playwright WebKit — skip splash animation (Reanimated may not finish in headless WebKit). */
export function isE2eMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.search.includes('e2e=1') ||
    window.localStorage.getItem('MS_E2E') === '1'
  );
}
