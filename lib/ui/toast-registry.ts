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
