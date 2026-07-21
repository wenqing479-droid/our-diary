(() => {
  "use strict";

  const STORAGE_KEY = "qingqing_laogong_diary_v1";
  const DB_NAME = "senye_home_storage";
  const DB_VERSION = 1;
  const STORE_NAME = "app_state";
  const ENTRIES_KEY = "entries";

  let dbPromise = null;
  let indexedDBAvailable = typeof indexedDB !== "undefined";

  function todayISO() {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
  }

  function normalizePhoto(raw, index = 0) {
    if (typeof raw === "string") {
      if (!raw.startsWith("data:image/")) return null;
      return {
        id: HomeImages.makeId(`legacy_${index}`),
        data: raw,
        name: `旧版照片${index + 1}`,
        type: raw.slice(5, raw.indexOf(";")) || "image/jpeg",
        createdAt: Date.now()
      };
    }
    if (!raw || typeof raw !== "object") return null;
    const data = typeof raw.data === "string" ? raw.data : typeof raw.src === "string" ? raw.src : "";
    const id = String(raw.id || HomeImages.makeId(`photo_${index}`));
    if (data && !data.startsWith("data:image/")) return null;
    if (!data && !id) return null;
    return {
      id,
      data,
      name: String(raw.name || `照片${index + 1}`).slice(0, 120),
      type: String(raw.type || (data ? data.slice(5, data.indexOf(";")) : "image/jpeg") || "image/jpeg"),
      width: Number(raw.width || 0) || undefined,
      height: Number(raw.height || 0) || undefined,
      createdAt: Number(raw.createdAt || Date.now())
    };
  }

  function normalizeEntry(e) {
    e = e && typeof e === "object" ? e : {};
    let sourcePhotos = Array.isArray(e.photos) ? e.photos : [];
    if (!sourcePhotos.length && typeof e.photo === "string" && e.photo.startsWith("data:image/")) {
      sourcePhotos = [e.photo];
    }
    const photos = sourcePhotos.map(normalizePhoto).filter(Boolean);
    return {
      id: String(e.id || HomeImages.makeId("entry")),
      date: String(e.date || todayISO()).slice(0, 10),
      weather: String(e.weather || ""),
      title: String(e.title || "").slice(0, 60),
      content: String(e.content || "").slice(0, 8000),
      whisper: String(e.whisper || "").slice(0, 1500),
      tags: Array.isArray(e.tags) ? [...new Set(e.tags.map(String).map(s => s.trim()).filter(Boolean))].slice(0, 12) : [],
      mood: String(e.mood || ""),
      photos,
      favorite: !!e.favorite,
      createdAt: Number(e.createdAt || Date.now()),
      updatedAt: Number(e.updatedAt || Date.now())
    };
  }

  function normalizeEntries(items) {
    return Array.isArray(items)
      ? items.filter(item => item && typeof item === "object").map(normalizeEntry)
      : [];
  }

  function lightweightEntries(entries) {
    return normalizeEntries(entries).map(entry => ({
      ...entry,
      photos: entry.photos.map(photo => ({
        id: photo.id,
        data: "",
        name: photo.name,
        type: photo.type,
        width: photo.width,
        height: photo.height,
        createdAt: photo.createdAt
      }))
    }));
  }

  function loadEntries() {
    let parsed;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      parsed = raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
    return normalizeEntries(parsed);
  }

  function openDB() {
    if (!indexedDBAvailable) return Promise.reject(new Error("当前浏览器不支持大容量本地存储"));
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("本地大容量存储打开失败"));
      request.onblocked = () => reject(new Error("本地存储正在被其他页面占用，请关闭旧页面后重试"));
    }).catch(error => {
      dbPromise = null;
      throw error;
    });
    return dbPromise;
  }

  async function readIndexedEntries() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(ENTRIES_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("本地日记读取失败"));
    });
  }

  async function writeIndexedEntries(entries) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(entries, ENTRIES_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("本地日记写入失败"));
      tx.onabort = () => reject(tx.error || new Error("本地日记写入被中断"));
    });
  }

  async function initialize(fallbackEntries = []) {
    const fallback = normalizeEntries(fallbackEntries);
    if (!indexedDBAvailable) return fallback;

    try {
      const stored = await readIndexedEntries();
      if (Array.isArray(stored)) return normalizeEntries(stored);

      if (fallback.length) {
        await writeIndexedEntries(fallback);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(lightweightEntries(fallback)));
        } catch (_) {
          // IndexedDB 已保存成功时，轻量索引写回失败不影响日记安全。
        }
      }
      return fallback;
    } catch (_) {
      return fallback;
    }
  }

  async function saveEntries(entries) {
    const normalized = normalizeEntries(entries);

    if (indexedDBAvailable) {
      try {
        await writeIndexedEntries(normalized);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(lightweightEntries(normalized)));
        } catch (_) {
          // 完整内容已经进入 IndexedDB；轻量索引失败不应把保存判定为失败。
        }
        return normalized;
      } catch (indexedError) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
          indexedDBAvailable = false;
          return normalized;
        } catch (_) {
          throw indexedError;
        }
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  async function clearEntries() {
    return saveEntries([]);
  }

  function countPhotos(entries) {
    return normalizeEntries(entries).reduce((sum, entry) => sum + entry.photos.length, 0);
  }

  function mergeEntries(current, incoming) {
    const map = new Map(normalizeEntries(current).map(entry => [entry.id, entry]));
    normalizeEntries(incoming).forEach(entry => map.set(entry.id, entry));
    return [...map.values()];
  }

  window.HomeDiary = {
    STORAGE_KEY,
    normalizeEntry,
    normalizeEntries,
    loadEntries,
    initialize,
    saveEntries,
    clearEntries,
    countPhotos,
    mergeEntries,
    usesIndexedDB: () => indexedDBAvailable
  };
})();
