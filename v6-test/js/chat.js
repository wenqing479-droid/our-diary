(() => {
  "use strict";

  const STORAGE_KEY = "qingqing_laogong_chat_messages_v1";
  const SENDERS = new Set(["qingqing", "laogong"]);

  function makeId() {
    return crypto.randomUUID?.() || `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function normalizeMessage(raw) {
    if (!raw || typeof raw !== "object") return null;
    const text = String(raw.text || "").trim().slice(0, 5000);
    if (!text) return null;
    const sender = SENDERS.has(raw.sender) ? raw.sender : "qingqing";
    const createdAt = Number(raw.createdAt) || Date.now();
    const updatedAt = Number(raw.updatedAt) || createdAt;
    return {
      id: String(raw.id || makeId()),
      sender,
      text,
      createdAt,
      updatedAt
    };
  }

  function normalizeMessages(rawMessages) {
    if (!Array.isArray(rawMessages)) return [];
    const seen = new Set();
    return rawMessages
      .map(normalizeMessage)
      .filter(Boolean)
      .filter(message => {
        if (seen.has(message.id)) return false;
        seen.add(message.id);
        return true;
      })
      .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  }

  function loadMessages() {
    try {
      return normalizeMessages(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
    } catch (_) {
      return [];
    }
  }

  function saveMessages(messages) {
    const normalized = normalizeMessages(messages);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function mergeMessages(current, incoming) {
    const map = new Map(normalizeMessages(current).map(message => [message.id, message]));
    normalizeMessages(incoming).forEach(message => {
      const existing = map.get(message.id);
      if (!existing || message.updatedAt >= existing.updatedAt) map.set(message.id, message);
    });
    return normalizeMessages([...map.values()]);
  }

  function verifyMessages(incoming, finalMessages) {
    const finalMap = new Map(normalizeMessages(finalMessages).map(message => [message.id, message]));
    const expected = normalizeMessages(incoming);
    let matched = 0;
    expected.forEach(message => {
      const restored = finalMap.get(message.id);
      if (
        restored &&
        restored.sender === message.sender &&
        restored.text === message.text &&
        restored.createdAt === message.createdAt
      ) matched++;
    });
    return {expected: expected.length, matched, ok: expected.length === matched};
  }

  window.HomeChat = {
    STORAGE_KEY,
    makeId,
    normalizeMessage,
    normalizeMessages,
    loadMessages,
    saveMessages,
    mergeMessages,
    verifyMessages
  };
})();
