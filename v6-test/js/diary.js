(() => {
  "use strict";

  const STORAGE_KEY = "qingqing_laogong_diary_v1";

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
    if (!data.startsWith("data:image/")) return null;
    return {
      id: String(raw.id || HomeImages.makeId(`photo_${index}`)),
      data,
      name: String(raw.name || `照片${index + 1}`).slice(0, 120),
      type: String(raw.type || data.slice(5, data.indexOf(";")) || "image/jpeg"),
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

  function loadEntries() {
    let parsed;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      parsed = raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }

    const normalized = normalizeEntries(parsed);
    try {
      if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      }
    } catch {
      // 迁移写回失败时仍返回已经读取到的日记，避免把旧数据误判为空。
    }
    return normalized;
  }

  function saveEntries(entries) {
    const normalized = normalizeEntries(entries);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function countPhotos(entries) {
    return normalizeEntries(entries).reduce((sum, entry) => sum + entry.photos.length, 0);
  }

  function mergeEntries(current, incoming) {
    const map = new Map(normalizeEntries(current).map(entry => [entry.id, entry]));
    normalizeEntries(incoming).forEach(entry => map.set(entry.id, entry));
    return [...map.values()];
  }

  window.HomeDiary = {STORAGE_KEY, normalizeEntry, normalizeEntries, loadEntries, saveEntries, countPhotos, mergeEntries};
})();
