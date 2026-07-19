(() => {
  "use strict";

  function buildPayload(entries, messages = [], avatars = {}) {
    const normalizedEntries = HomeDiary.normalizeEntries(entries);
    const normalizedMessages = window.HomeChat ? HomeChat.normalizeMessages(messages) : [];
    const normalizedAvatars = window.HomeAvatars ? HomeAvatars.normalizeState(avatars) : {};
    return {
      app: "我们的每一天",
      schema: "qingqing-laogong-home",
      version: 4,
      exportedAt: new Date().toISOString(),
      summary: {
        entries: normalizedEntries.length,
        photos: HomeDiary.countPhotos(normalizedEntries),
        messages: normalizedMessages.length,
        customAvatars: window.HomeAvatars ? HomeAvatars.countCustom(normalizedAvatars) : 0
      },
      entries: normalizedEntries,
      messages: normalizedMessages,
      avatars: normalizedAvatars
    };
  }

  function countRawPhotos(rawEntries) {
    return rawEntries.reduce((sum, entry) => {
      if (!entry || typeof entry !== "object") return sum;
      if (Array.isArray(entry.photos)) return sum + entry.photos.length;
      return sum + (typeof entry.photo === "string" && entry.photo ? 1 : 0);
    }, 0);
  }

  function countRawAvatars(rawAvatars) {
    if (!rawAvatars || typeof rawAvatars !== "object") return 0;
    return Number(Boolean(rawAvatars.qingqing)) + Number(Boolean(rawAvatars.laogong));
  }

  function parseBackup(text) {
    const parsed = JSON.parse(text);
    const rawEntries = Array.isArray(parsed) ? parsed : parsed && parsed.entries;
    if (!Array.isArray(rawEntries)) throw new Error("备份格式不正确");

    const rawEntryCount = rawEntries.length;
    const rawPhotoCount = countRawPhotos(rawEntries);
    const entries = HomeDiary.normalizeEntries(rawEntries);
    const validPhotoCount = HomeDiary.countPhotos(entries);

    const hasMessages = !!(parsed && Array.isArray(parsed.messages));
    const rawMessages = hasMessages ? parsed.messages : [];
    const messages = window.HomeChat ? HomeChat.normalizeMessages(rawMessages) : [];

    const hasAvatars = !!(parsed && parsed.avatars && typeof parsed.avatars === "object" && !Array.isArray(parsed.avatars));
    const rawAvatars = hasAvatars ? parsed.avatars : {};
    const avatars = window.HomeAvatars ? HomeAvatars.normalizeState(rawAvatars) : {};
    const rawAvatarCount = countRawAvatars(rawAvatars);
    const validAvatarCount = window.HomeAvatars ? HomeAvatars.countCustom(avatars) : 0;

    return {
      entries,
      messages,
      avatars,
      hasMessages,
      hasAvatars,
      version: Number(parsed && parsed.version || 1),
      summary: {
        entries: entries.length,
        photos: validPhotoCount,
        messages: messages.length,
        customAvatars: validAvatarCount
      },
      issues: {
        droppedEntries: Math.max(0, rawEntryCount - entries.length),
        droppedPhotos: Math.max(0, rawPhotoCount - validPhotoCount),
        droppedMessages: Math.max(0, rawMessages.length - messages.length),
        droppedAvatars: Math.max(0, rawAvatarCount - validAvatarCount)
      }
    };
  }

  function verifyRestore(
    incomingEntries,
    finalEntries,
    incomingMessages = [],
    finalMessages = [],
    incomingAvatars = {},
    finalAvatars = {}
  ) {
    const normalizedIncoming = HomeDiary.normalizeEntries(incomingEntries);
    const finalMap = new Map(HomeDiary.normalizeEntries(finalEntries).map(entry => [entry.id, entry]));
    let matchedEntries = 0;
    let photosExpected = 0;
    let photosMatched = 0;

    normalizedIncoming.forEach(entry => {
      const finalEntry = finalMap.get(entry.id);
      photosExpected += entry.photos.length;
      if (!finalEntry) return;
      const same = entry.photos.length === finalEntry.photos.length && entry.photos.every((photo, index) => {
        const restored = finalEntry.photos[index];
        const matched = !!restored && restored.data === photo.data;
        if (matched) photosMatched++;
        return matched;
      });
      if (same) matchedEntries++;
    });

    const messageCheck = window.HomeChat
      ? HomeChat.verifyMessages(incomingMessages, finalMessages)
      : {expected: 0, matched: 0, ok: true};
    const avatarCheck = window.HomeAvatars
      ? HomeAvatars.verifyState(incomingAvatars, finalAvatars)
      : {expected: 0, matched: 0, ok: true};

    return {
      entriesExpected: normalizedIncoming.length,
      matchedEntries,
      photosExpected,
      photosMatched,
      messagesExpected: messageCheck.expected,
      messagesMatched: messageCheck.matched,
      avatarsExpected: avatarCheck.expected,
      avatarsMatched: avatarCheck.matched,
      ok:
        matchedEntries === normalizedIncoming.length &&
        photosMatched === photosExpected &&
        messageCheck.ok &&
        avatarCheck.ok
    };
  }

  function textBytes(text) {
    return new Blob([text]).size;
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    const value = bytes / Math.pow(1024, index);
    return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
  }

  function download(content, filename, type = "application/json;charset=utf-8") {
    const blob = new Blob([content], {type});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  window.HomeBackup = {
    buildPayload,
    parseBackup,
    verifyRestore,
    textBytes,
    formatBytes,
    download
  };
})();
