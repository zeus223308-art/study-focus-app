type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeGoogleDriveSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyGoogleDriveSessionChanged(): void {
  listeners.forEach((listener) => listener());
}
