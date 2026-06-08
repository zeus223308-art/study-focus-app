/** Inline in index.html before app bundle — iPhone 7 / iOS 12–15 Safari. Keep in sync with +html.tsx. */
(function () {
  var g =
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof window !== 'undefined'
        ? window
        : this;
  if (typeof g.globalThis === 'undefined') g.globalThis = g;

  if (typeof Object.hasOwn !== 'function') {
    Object.hasOwn = function (obj, prop) {
      return Object.prototype.hasOwnProperty.call(obj, prop);
    };
  }

  if (typeof g.structuredClone !== 'function') {
    g.structuredClone = function (val) {
      if (val === undefined) return val;
      if (typeof val === 'function') return val;
      return JSON.parse(JSON.stringify(val));
    };
  }

  if (!Array.prototype.at) {
    Array.prototype.at = function (n) {
      var len = this.length;
      var i = Math.trunc(Number(n)) || 0;
      if (i < 0) i += len;
      return i < 0 || i >= len ? undefined : this[i];
    };
  }

  if (!String.prototype.at) {
    String.prototype.at = function (n) {
      var len = this.length;
      var i = Math.trunc(Number(n)) || 0;
      if (i < 0) i += len;
      return i < 0 || i >= len ? undefined : this[i];
    };
  }

  if (typeof Promise.withResolvers !== 'function') {
    Promise.withResolvers = function () {
      var resolve, reject;
      var promise = new Promise(function (res, rej) {
        resolve = res;
        reject = rej;
      });
      return { promise: promise, resolve: resolve, reject: reject };
    };
  }

  if (!Array.prototype.findLast) {
    Array.prototype.findLast = function (fn, thisArg) {
      for (var i = this.length - 1; i >= 0; i--) {
        if (fn.call(thisArg, this[i], i, this)) return this[i];
      }
      return undefined;
    };
  }

  if (!Array.prototype.findLastIndex) {
    Array.prototype.findLastIndex = function (fn, thisArg) {
      for (var i = this.length - 1; i >= 0; i--) {
        if (fn.call(thisArg, this[i], i, this)) return i;
      }
      return -1;
    };
  }
})();
