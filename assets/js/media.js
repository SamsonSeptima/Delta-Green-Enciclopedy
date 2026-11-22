/* DELTA GREEN — media store: IndexedDB with localStorage fallback (file:// safe) */
(function () {
  'use strict';
  const DG = window.DG = window.DG || {};
  const DB_NAME = 'dg-media';
  const STORE = 'media';
  const LS_PREFIX = 'dgmedia.';
  let dbp = null;
  const urls = new Map();
  let lsMode = false;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve) => {
      if (!('indexedDB' in window)) { lsMode = true; resolve(null); return; }
      let req;
      try { req = indexedDB.open(DB_NAME, 1); } catch (e) { lsMode = true; resolve(null); return; }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { lsMode = true; resolve(null); };
      req.onblocked = () => { lsMode = true; resolve(null); };
    });
    return dbp;
  }

  function blobToDataURL(blob) {
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  }

  async function lsSet(key, blob) {
    const data = await blobToDataURL(blob);
    if (!data) return false;
    try { localStorage.setItem(LS_PREFIX + key, data); return true; }
    catch (e) {
      if (DG.toast) DG.toast('Хранилище изображений переполнено. Удалите лишние фото.', 4200);
      return false;
    }
  }

  const DGMedia = {
    async get(key) {
      const db = await open();
      if (!db) return null;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE, 'readonly');
          const req = tx.objectStore(STORE).get(key);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        } catch (e) { resolve(null); }
      });
    },
    async set(key, blob) {
      const db = await open();
      if (!db) return lsSet(key, blob);
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).put(blob, key);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => { lsSet(key, blob).then(resolve); };
        } catch (e) { lsSet(key, blob).then(resolve); }
      });
    },
    async del(key) {
      try { localStorage.removeItem(LS_PREFIX + key); } catch (e) {}
      const db = await open();
      if (!db) return true;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).delete(key);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (e) { resolve(false); }
      });
    },
    async url(key) {
      if (urls.has(key)) return urls.get(key);
      let u = null;
      try {
        const ls = localStorage.getItem(LS_PREFIX + key);
        if (ls) u = ls;
      } catch (e) {}
      if (!u) {
        const blob = await this.get(key);
        if (blob) u = URL.createObjectURL(blob);
      }
      if (u) urls.set(key, u);
      return u;
    },
    revoke(key) {
      const u = urls.get(key);
      if (u && String(u).startsWith('blob:')) URL.revokeObjectURL(u);
      urls.delete(key);
    },
    pick() {
      return new Promise((resolve) => {
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = 'image/*';
        inp.onchange = () => resolve(inp.files && inp.files[0] ? inp.files[0] : null);
        inp.click();
      });
    },
    compress(file, maxW = 1000, quality = 0.82) {
      return new Promise((resolve) => {
        if (!file || !/^image\//.test(file.type)) { resolve(null); return; }
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          const ratio = Math.min(1, maxW / Math.max(img.width, 1));
          const w = Math.max(1, Math.round(img.width * ratio));
          const h = Math.max(1, Math.round(img.height * ratio));
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          c.toBlob(b => resolve(b), 'image/jpeg', quality);
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
        img.src = url;
      });
    },
    lsMode() { return lsMode; }
  };

  DG.media = DGMedia;
})();
