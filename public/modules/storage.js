/**
 * Optimized, LRU-aware, safe localStorage manager with in-memory caching.
 * Protects against QuotaExceededError, private-browsing restrictions, and eliminates synchronous JSON parse thrashing.
 */

const memoryCache = new Map();

// Ratings stored in the catalog cache must never invent a fallback score.
const clampStoredRating = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const rating = Number.parseFloat(value);
  if (!Number.isFinite(rating) || rating <= 0) return null;
  return Math.min(9.9, Math.max(0, Math.round(rating * 10) / 10));
};
const debouncedTimers = new Map();

export const storage = {
  /**
   * Retrieve an item from cache or localStorage with automatic JSON parsing
   */
  get(key, defaultValue = null) {
    if (memoryCache.has(key)) {
      return memoryCache.get(key);
    }
    try {
      const raw = localStorage.getItem(key);
      if (raw === null || raw === undefined) {
        memoryCache.set(key, defaultValue);
        return defaultValue;
      }
      try {
        const parsed = JSON.parse(raw);
        memoryCache.set(key, parsed);
        return parsed;
      } catch {
        memoryCache.set(key, raw);
        return raw;
      }
    } catch (e) {
      console.warn(`[storage] Could not read key "${key}":`, e);
      return defaultValue;
    }
  },

  /**
   * Store an item safely with in-memory caching and automatic serialization
   */
  set(key, value) {
    memoryCache.set(key, value);
    try {
      const serialized = typeof value === "string" ? value : JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (e) {
      if (e && (e.name === "QuotaExceededError" || e.code === 22 || e.number === -2147024882)) {
        console.warn("[storage] Quota exceeded. Evicting stale cache items...");
        storage.purgeStaleEntries();
        try {
          const serialized = typeof value === "string" ? value : JSON.stringify(value);
          localStorage.setItem(key, serialized);
        } catch (retryErr) {
          console.error(`[storage] Failed to write key "${key}" after purge:`, retryErr);
        }
      } else {
        console.warn(`[storage] Failed to write key "${key}":`, e);
      }
    }
  },

  /**
   * Debounced store for high-frequency writes (e.g., playback progress)
   */
  setDebounced(key, value, delay = 600) {
    memoryCache.set(key, value);
    if (debouncedTimers.has(key)) {
      clearTimeout(debouncedTimers.get(key));
    }
    const timer = setTimeout(() => {
      debouncedTimers.delete(key);
      storage.set(key, value);
    }, delay);
    debouncedTimers.set(key, timer);
  },

  /**
   * Remove an item from both memory cache and localStorage
   */
  remove(key) {
    memoryCache.delete(key);
    if (debouncedTimers.has(key)) {
      clearTimeout(debouncedTimers.get(key));
      debouncedTimers.delete(key);
    }
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[storage] Could not remove key "${key}":`, e);
    }
  },

  /**
   * Purge playback positions older than 30 days and truncate catalog cache
   */
  purgeStaleEntries() {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith("ustream-pos-") || k.startsWith("ustream-catalog-cache"))) {
          keysToRemove.push(k);
        }
      }
      for (const k of keysToRemove) {
        localStorage.removeItem(k);
        memoryCache.delete(k);
      }
    } catch (e) {
      console.warn("[storage] Purge error:", e);
    }
  },

  /**
   * Compact catalog items to retain only essential card properties and cap size
   */
  compactCatalog(items, max = 400) {
    if (!Array.isArray(items)) return [];
    return items.slice(0, max).map((item) => ({
      id: item.id,
      tmdbId: item.tmdbId,
      subjectId: item.subjectId,
      title: item.title,
      originalTitle: item.originalTitle || "",
      type: item.type || "movie",
      category: item.category || item.type || "movie",
      year: item.year ?? null,
      rating: clampStoredRating(item.rating),
      releaseDate: item.releaseDate || item.first_air_date || item.release_date || "",
      isComingSoon: Boolean(item.isComingSoon || item.comingSoon),
      comingSoon: Boolean(item.isComingSoon || item.comingSoon),
      originalLanguage: item.originalLanguage || "",
      runtime: item.runtime || item.duration || "",
      image: item.image || item.cover?.url || "",
      backdrop: item.backdrop || item.image || "",
      genre: Array.isArray(item.genre) ? item.genre : [item.type || "movie"],
      description: item.description ? item.description.slice(0, 280) : (item.overview ? item.overview.slice(0, 280) : ""),
      kicker: item.kicker || (item.type === "series" ? "Hit Series" : "Blockbuster"),
      badge: item.badge || "",
      gradient: item.gradient || "linear-gradient(145deg, #1e293b, #0f172a 50%, #020617)",
      country: item.country || item.countryName || "",
      language: item.language || "",
      adult: Boolean(item.adult || item.isAdult),
      isAdult: Boolean(item.adult || item.isAdult),
      maturityRating: item.maturityRating || "",
      isJapaneseAnime: Boolean(item.isJapaneseAnime),
      isCartoon: Boolean(item.isCartoon),
      seNum: item.seNum ?? (item.type === "movie" ? 0 : 1),
      mediaType: item.mediaType || (item.type === "movie" ? "movie" : "tv")
    }));
  }
};
