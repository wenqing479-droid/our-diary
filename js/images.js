(() => {
  "use strict";

  function makeId(prefix = "photo") {
    return crypto.randomUUID
      ? crypto.randomUUID()
      : `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("图片读取失败"));
      reader.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("图片加载失败"));
      img.src = src;
    });
  }

  async function compressImage(file) {
    if (!file || !String(file.type || "").startsWith("image/")) {
      throw new Error("请选择图片文件");
    }
    if (file.size > 15 * 1024 * 1024) {
      throw new Error(`${file.name || "图片"} 超过 15MB`);
    }

    const dataUrl = await readFileAsDataURL(file);
    const img = await loadImage(dataUrl);
    const maxSide = 1280;
    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;
    const ratio = Math.min(1, maxSide / Math.max(width, height));
    width = Math.max(1, Math.round(width * ratio));
    height = Math.max(1, Math.round(height * ratio));

    const canvas = document.createElement("canvas");
    const draw = (targetWidth, targetHeight) => {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d", {alpha: false});
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    };

    draw(width, height);
    let quality = 0.72;
    let compressed = canvas.toDataURL("image/jpeg", quality);
    const targetBytes = 720 * 1024;

    while (estimateDataUrlBytes(compressed) > targetBytes && quality > 0.52) {
      quality = Math.max(0.52, quality - 0.08);
      compressed = canvas.toDataURL("image/jpeg", quality);
    }

    if (estimateDataUrlBytes(compressed) > targetBytes && Math.max(width, height) > 960) {
      const shrink = 960 / Math.max(width, height);
      width = Math.max(1, Math.round(width * shrink));
      height = Math.max(1, Math.round(height * shrink));
      draw(width, height);
      compressed = canvas.toDataURL("image/jpeg", 0.62);
    }

    return {
      id: makeId(),
      data: compressed,
      name: String(file.name || "照片").slice(0, 120),
      type: "image/jpeg",
      width,
      height,
      createdAt: Date.now()
    };
  }

  function clonePhotos(photos) {
    return Array.isArray(photos) ? photos.map(photo => ({...photo})) : [];
  }

  function estimateDataUrlBytes(dataUrl) {
    if (typeof dataUrl !== "string") return 0;
    const comma = dataUrl.indexOf(",");
    if (comma < 0) return new Blob([dataUrl]).size;
    const base64 = dataUrl.slice(comma + 1);
    const padding = (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
    return Math.max(0, Math.floor(base64.length * 3 / 4) - padding);
  }

  window.HomeImages = {makeId, compressImage, clonePhotos, estimateDataUrlBytes};
})();
