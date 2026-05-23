import type { AppData } from '@/lib/domain/types';

/** In-memory only — cleared on process restart or explicit sign-out. */
let guestSessionData: AppData | null = null;

export function getGuestSessionData(): AppData | null {
  return guestSessionData;
}

export function setGuestSessionData(data: AppData): void {
  guestSessionData = data;
}

export function clearGuestSession(): void {
  guestSessionData = null;
}
