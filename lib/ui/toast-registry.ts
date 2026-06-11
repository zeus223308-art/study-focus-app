export type ToastRequest = {
  id: number;
  title?: string;
  message: string;
  durationMs: number;
};

let presentToast: ((request: Omit<ToastRequest, 'id'>) => void) | null = null;

export function registerToast(handler: ((request: Omit<ToastRequest, 'id'>) => void) | null) {
  presentToast = handler;
}

export function showToast(
  message: string,
  options?: { title?: string; durationMs?: number }
): void {
  presentToast?.({
    message,
    title: options?.title,
    durationMs: options?.durationMs ?? 2500,
  });
}

/** Playwright WebKit e2e — invoke `showToast` without OAuth. */
declare global {
  interface Window {
    __MS_E2E__?: { showToast: typeof showToast };
  }
}

if (typeof window !== 'undefined') {
  window.__MS_E2E__ = { showToast };
}
