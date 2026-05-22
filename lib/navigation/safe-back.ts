import type { Href } from 'expo-router';
import type { Router } from 'expo-router';

const DEFAULT_FALLBACK: Href = '/(tabs)/vault';

/** Avoid "GO_BACK was not handled" when the stack has no prior screen (common on web). */
export function safeRouterBack(router: Router, fallback: Href = DEFAULT_FALLBACK) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}
