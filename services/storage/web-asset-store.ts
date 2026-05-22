import { Platform } from 'react-native';

const DB_NAME = 'memory_sherpa_assets_v1';
const STORE = 'assets';
const SCHEME = 'msherpa-asset://';

const objectUrlCache = new Map<string, string>();

export type WebAssetRole = 'master' | 'thumb' | 'mini' | 'back';

export function webAssetKey(bundleId: string, pageId: string, role: WebAssetRole): string {
  return `${bundleId}/${pageId}/${role}`;
}

export function toWebStoredUri(key: string): string {
  return `${SCHEME}${key}`;
}

export function parseWebStoredUri(uri: string): string | null {
  if (!uri.startsWith(SCHEME)) return null;
  return uri.slice(SCHEME.length);
}

function isWeb(): boolean {
  return Platform.OS === 'web' && typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

export async function putWebAsset(key: string, blob: Blob): Promise<void> {
  if (!isWeb()) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB put failed'));
  });
  db.close();
  const cached = objectUrlCache.get(key);
  if (cached) {
    URL.revokeObjectURL(cached);
    objectUrlCache.delete(key);
  }
}

async function getWebAssetBlob(key: string): Promise<Blob | null> {
  if (!isWeb()) return null;
  const db = await openDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB get failed'));
  });
  db.close();
  return blob;
}

export async function getWebAssetObjectUrl(key: string): Promise<string | null> {
  if (!isWeb()) return null;
  const hit = objectUrlCache.get(key);
  if (hit) return hit;
  const blob = await getWebAssetBlob(key);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  objectUrlCache.set(key, url);
  return url;
}

export async function uriToBlob(uri: string): Promise<Blob> {
  const res = await fetch(uri);
  if (!res.ok) throw new Error(`Failed to read image: ${res.status}`);
  return res.blob();
}

export async function persistUriToWebStore(
  sourceUri: string,
  bundleId: string,
  pageId: string,
  role: WebAssetRole
): Promise<string> {
  const blob = await uriToBlob(sourceUri);
  const key = webAssetKey(bundleId, pageId, role);
  await putWebAsset(key, blob);
  return toWebStoredUri(key);
}
