(() => {
  "use strict";

  const STORAGE_KEY = "qingqing_laogong_chat_avatars_v1";
  const DEFAULTS = Object.freeze({
    qingqing: "assets/avatars/qingqing-watermelon.jpeg",
    laogong: "assets/avatars/laogong-flowers.jpeg"
  });
  const SENDERS = new Set(["qingqing", "laogong"]);

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("头像读取失败"));
      reader.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("头像加载失败"));
      img.src = src;
    });
  }

  function normalizeAvatar(raw) {
    if (!raw || typeof raw !== "object") return null;
    const data = typeof raw.data === "string" ? raw.data : "";
    if (!/^data:image\/(?:png|jpeg|jpg|webp);base64,/i.test(data)) return null;
    return {
      data,
      name: String(raw.name || "自定义头像").slice(0, 120),
      updatedAt: Number(raw.updatedAt) || Date.now()
    };
  }

  function normalizeState(raw) {
    const state = raw && typeof raw === "object" ? raw : {};
    return {
      qingqing: normalizeAvatar(state.qingqing),
      laogong: normalizeAvatar(state.laogong)
    };
  }

  function loadAvatars() {
    try {
      return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"));
    } catch (_) {
      return normalizeState({});
    }
  }

  function saveAvatars(state) {
    const normalized = normalizeState(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function resolve(state, sender) {
    const who = SENDERS.has(sender) ? sender : "qingqing";
    const normalized = normalizeState(state);
    return normalized[who]?.data || DEFAULTS[who];
  }

  function countCustom(state) {
    const normalized = normalizeState(state);
    return Number(Boolean(normalized.qingqing)) + Number(Boolean(normalized.laogong));
  }

  function mergeStates(current, incoming) {
    const base = normalizeState(current);
    const next = normalizeState(incoming);
    SENDERS.forEach(sender => {
      if (next[sender]) base[sender] = next[sender];
    });
    return base;
  }

  function verifyState(incoming, finalState) {
    const expected = normalizeState(incoming);
    const actual = normalizeState(finalState);
    let expectedCount = 0;
    let matched = 0;
    SENDERS.forEach(sender => {
      if (!expected[sender]) return;
      expectedCount++;
      if (actual[sender]?.data === expected[sender].data) matched++;
    });
    return {expected: expectedCount, matched, ok: expectedCount === matched};
  }

  async function processAvatar(file) {
    if (!file || !String(file.type || "").startsWith("image/")) {
      throw new Error("请选择图片文件");
    }
    if (file.size > 12 * 1024 * 1024) {
      throw new Error("头像文件不能超过 12MB");
    }

    const dataUrl = await readFileAsDataURL(file);
    const img = await loadImage(dataUrl);
    const sourceWidth = img.naturalWidth || img.width;
    const sourceHeight = img.naturalHeight || img.height;
    const cropSize = Math.min(sourceWidth, sourceHeight);
    const sx = Math.max(0, Math.floor((sourceWidth - cropSize) / 2));
    const sy = Math.max(0, Math.floor((sourceHeight - cropSize) / 2));
    const outputSize = 640;

    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d", {alpha: false});
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outputSize, outputSize);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, outputSize, outputSize);

    return {
      data: canvas.toDataURL("image/jpeg", 0.84),
      name: String(file.name || "自定义头像").slice(0, 120),
      updatedAt: Date.now()
    };
  }

  window.HomeAvatars = {
    STORAGE_KEY,
    DEFAULTS,
    normalizeAvatar,
    normalizeState,
    loadAvatars,
    saveAvatars,
    resolve,
    countCustom,
    mergeStates,
    verifyState,
    processAvatar
  };
})();
