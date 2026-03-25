/**
 * CareOps Pro — Offline Engine
 * Manages local caching, action queuing, and sync for field workers.
 * All PHI is stored under a user-scoped key so logout wipes it.
 */

const STORAGE_PREFIX = "careops_offline_";
const QUEUE_KEY = "careops_action_queue";

// Simple XOR-based obfuscation (real apps use SubtleCrypto — this simulates encryption layer)
function encode(data) {
  return btoa(encodeURIComponent(JSON.stringify(data)));
}
function decode(str) {
  try {
    return JSON.parse(decodeURIComponent(atob(str)));
  } catch {
    return null;
  }
}

function scopedKey(userId, key) {
  return `${STORAGE_PREFIX}${userId}_${key}`;
}

export const offlineEngine = {
  // ── Write ──────────────────────────────────────────────────────────────────
  set(userId, key, value) {
    try {
      localStorage.setItem(scopedKey(userId, key), encode(value));
    } catch (e) {
      console.warn("Offline cache write failed:", e);
    }
  },

  // ── Read ───────────────────────────────────────────────────────────────────
  get(userId, key) {
    try {
      const raw = localStorage.getItem(scopedKey(userId, key));
      return raw ? decode(raw) : null;
    } catch {
      return null;
    }
  },

  // ── Wipe all PHI for a user on logout ─────────────────────────────────────
  clearUser(userId) {
    const prefix = `${STORAGE_PREFIX}${userId}_`;
    Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix))
      .forEach((k) => localStorage.removeItem(k));
    // Also clear action queue entries for this user
    const queue = offlineEngine.getQueue().filter((a) => a.userId !== userId);
    localStorage.setItem(QUEUE_KEY, encode(queue));
  },

  // ── Action Queue (offline mutations) ─────────────────────────────────────
  getQueue() {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      return raw ? decode(raw) : [];
    } catch {
      return [];
    }
  },

  enqueue(action) {
    const queue = offlineEngine.getQueue();
    const entry = { ...action, id: crypto.randomUUID(), enqueuedAt: new Date().toISOString() };
    queue.push(entry);
    localStorage.setItem(QUEUE_KEY, encode(queue));
    return entry.id;
  },

  dequeue(actionId) {
    const queue = offlineEngine.getQueue().filter((a) => a.id !== actionId);
    localStorage.setItem(QUEUE_KEY, encode(queue));
  },

  clearQueue(userId) {
    const queue = offlineEngine.getQueue().filter((a) => a.userId !== userId);
    localStorage.setItem(QUEUE_KEY, encode(queue));
  },

  queueLength(userId) {
    return offlineEngine.getQueue().filter((a) => !userId || a.userId === userId).length;
  },
};

// ── Connectivity hook helper ───────────────────────────────────────────────
export function getIsOnline() {
  return navigator.onLine;
}