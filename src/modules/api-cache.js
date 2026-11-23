// Small TTL cache for read-only API responses (TMDB, TVMaze).
//
// Memory first, optionally mirrored to sessionStorage so a reload in the
// same tab does not refetch everything. Both TMDB and TVMaze allow
// client-side caching of their responses; caching also keeps us well
// inside their rate limits. Entries are bounded (count and size) and
// every storage call is guarded: private mode / quota errors only
// disable the mirror, never the app.

export function createTtlCache({
  ttlMs = 30 * 60 * 1000,
  maxEntries = 300,
  maxStoredBytes = 60 * 1024,
  prefix = "ustream-cache:",
  storage = null,
  now = () => Date.now(),
} = {}) {
  const memory = new Map();

  const read = (key) => {
    if (memory.has(key)) return memory.get(key);
    if (!storage) return undefined;
    try {
      const raw = storage.getItem(prefix + key);
      if (!raw) return undefined;
      const entry = JSON.parse(raw);
      memory.set(key, entry);
      return entry;
    } catch {
      return undefined;
    }
  };

  const evictOldest = () => {
    while (memory.size > maxEntries) {
      const oldest = memory.keys().next().value;
      memory.delete(oldest);
      try { storage?.removeItem(prefix + oldest); } catch {}
    }
  };

  return {
    get(key) {
      const entry = read(key);
      if (!entry) return undefined;
      if (now() - entry.t > (entry.ttl ?? ttlMs)) {
        this.delete(key);
        return undefined;
      }
      return entry.v;
    },
    set(key, value, entryTtlMs = ttlMs) {
      const entry = { t: now(), ttl: entryTtlMs, v: value };
      memory.delete(key);
      memory.set(key, entry);
      evictOldest();
      if (!storage) return;
      try {
        const raw = JSON.stringify(entry);
        if (raw.length <= maxStoredBytes) storage.setItem(prefix + key, raw);
      } catch {
        // Quota exceeded or storage unavailable: keep the memory copy.
      }
    },
    delete(key) {
      memory.delete(key);
      try { storage?.removeItem(prefix + key); } catch {}
    },
    clear() {
      for (const key of memory.keys()) {
        try { storage?.removeItem(prefix + key); } catch {}
      }
      memory.clear();
    },
    get size() { return memory.size; },
  };
}

/** sessionStorage when usable, else null. */
export function safeSessionStorage() {
  try {
    if (typeof sessionStorage === "undefined") return null;
    const probe = "__ustream_probe__";
    sessionStorage.setItem(probe, "1");
    sessionStorage.removeItem(probe);
    return sessionStorage;
  } catch {
    return null;
  }
}
