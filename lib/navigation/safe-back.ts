import type { Href } from 'expo-router';
import { router as expoRouter } from 'expo-router';

const DEFAULT_FALLBACK: Href = '/(tabs)/vault';

type ExpoRouter = typeof expoRouter;

/** Avoid "GO_BACK was not handled" when the stack has no prior screen (common on web). */
export function safeRouterBack(router: ExpoRouter, fallback: Href = DEFAULT_FALLBACK) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}
