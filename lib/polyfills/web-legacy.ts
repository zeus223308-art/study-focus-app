// @ts-nocheck — prototype polyfills for legacy Safari; not typed for strict TS.
import { Platform } from 'react-native';

/** Runtime polyfills for older mobile Safari (iPhone 7, iOS 12–15). */
export function installWebLegacyPolyfills(): void {
  if (Platform.OS !== 'web' || typeof globalThis === 'undefined') return;

  const g = globalThis;

  if (typeof Object.hasOwn !== 'function') {
    Object.hasOwn = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
  }

  if (typeof g.structuredClone !== 'function') {
    g.structuredClone = (val) => {
      if (val === undefined) return val;
      if (typeof val === 'function') return val;
      return JSON.parse(JSON.stringify(val));
    };
  }

  if (!Array.prototype.at) {
    Array.prototype.at = function at(index) {
      const len = this.length;
      let i = Math.trunc(Number(index)) || 0;
      if (i < 0) i += len;
      if (i < 0 || i >= len) return undefined;
      return this[i];
    };
  }

  if (!String.prototype.at) {
    String.prototype.at = function at(index) {
      const len = this.length;
      let i = Math.trunc(Number(index)) || 0;
      if (i < 0) i += len;
      if (i < 0 || i >= len) return undefined;
      return this[i];
    };
  }

  if (typeof Promise.withResolvers !== 'function') {
    Promise.withResolvers = function withResolvers() {
      let resolve;
      let reject;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
  }
}

installWebLegacyPolyfills();
