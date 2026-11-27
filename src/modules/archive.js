// Internet Archive public-domain films — direct playback.
//
// The Internet Archive (archive.org) hosts public-domain feature
// films anyone may stream for free: no key, no account, no ads. Ustream
// plays them directly in its own native HTML5 player — no embed
// server, no provider picker, nothing to bypass.
//
// Every curated identifier below was verified against the Archive
// metadata API before shipping: the item exists, is a movie, and has
// a playable MP4 file (checked live 2026-11-23). At runtime each item
// is re-verified the same way (metadata fetch + playable-file pick);
// an item that no longer has a playable file is dropped silently, and
// if the whole request fails the section hides itself with no error
// banner — free movies are a bonus row, never a broken one.
//
// Attribution: films are served by the Internet Archive; posters are
// its generated thumbnails (__ia_thumb.jpg).

import { fetchWithRetry } from "./loader.js";

export const ARCHIVE_ATTRIBUTION = "Public-domain films from the Internet Archive (archive.org).";
export const ARCHIVE_METADATA_BASE = "https://archive.org/metadata/";
export const ARCHIVE_DOWNLOAD_BASE = "https://archive.org/download/";

/**
 * Curated public-domain feature films, verified playable on
 * 2026-11-23 (each has an h.264 or MPEG4 MP4 that answers 206 with
 * video/mp4, plus a thumbnail). Titles/years are the films' own;
 * the metadata API is the source of truth at runtime and these
 * values are only fallbacks. "The Kid" (1921) was checked and left
 * out: the only full copy found is a 3.1 GB file, too heavy to stream.
 */
export const CURATED_ARCHIVE_FILMS = [
  { identifier: "night-of-the-living-dead-raw-unrestored", title: "Night of the Living Dead", year: 1968 },
  { identifier: "HisGirlFriday", title: "His Girl Friday", year: 1940 },
  { identifier: "TheGeneral", title: "The General", year: 1927 },
  { identifier: "Nosferatu2_201606", title: "Nosferatu", year: 1922 },
  { identifier: "metropolis-1927_202511", title: "Metropolis", year: 1927 },
  { identifier: "sherlock-jr-1924-restored-720p-hd", title: "Sherlock Jr.", year: 1924 },
  { identifier: "a-trip-to-the-moon-le-voyage-dans-la-lune-1902", title: "A Trip to the Moon", year: 1902 },
  { identifier: "the-phantom-of-the-opera-1925-ben-model-score-sd", title: "The Phantom of the Opera", year: 1925 },
  { identifier: "BattleshipPotemkin", title: "Battleship Potemkin", year: 1925 },
  { identifier: "man-with-a-movie-camera", title: "Man with a Movie Camera", year: 1929 },
];

/** Direct stream URL for a file in an Archive item. */
export function archiveStreamUrl(identifier, fileName) {
  return `${ARCHIVE_DOWNLOAD_BASE}${identifier}/${encodeURIComponent(fileName)}`;
}

/** Generated thumbnail for an Archive item. */
export function archivePosterUrl(identifier) {
  return `${ARCHIVE_DOWNLOAD_BASE}${identifier}/__ia_thumb.jpg`;
}

function formatScore(file) {
  const format = String(file?.format || "").toLowerCase();
  const name = String(file?.name || "").toLowerCase();
  if (!name.endsWith(".mp4")) return -1;
  // Archive's ".ia.mp4" derivatives are h.264; the _512kb.mp4 files
  // are the low-bitrate streaming derivatives.
  if (format.includes("h.264")) return 3;
  if (format.includes("512kb")) return 2;
  if (format.includes("mpeg4") || format.includes("mp4")) return 1;
  return 0;
}

/**
 * Pick the best playable file from an Archive item's file list.
 * Prefers h.264 MP4, then the 512kb streaming MP4, then any MP4;
 * on a format tie the smaller file wins (lighter to stream).
 * Returns the file object, or null when nothing is playable.
 */
export function pickPlayableFile(files) {
  if (!Array.isArray(files)) return null;
  let best = null;
  let bestScore = -1;
  for (const file of files) {
    const score = formatScore(file);
    if (score < 0) continue;
    const size = Number(file.size) || 0;
    const bestSize = best ? Number(best.size) || 0 : 0;
    if (score > bestScore || (score === bestScore && size > 0 && (bestSize === 0 || size < bestSize))) {
      best = file;
      bestScore = score;
    }
  }
  return best;
}

/** Seconds -> "1h 36m" / "42m". Returns "" when unknown. */
export function formatArchiveRuntime(seconds) {
  const total = Math.round(Number(seconds));
  if (!Number.isFinite(total) || total <= 0) return "";
  const hours = Math.floor(total / 3600);
  const minutes = Math.round((total % 3600) / 60);
  return hours > 0 ? `${hours}h ${String(minutes).padStart(2, "0")}m` : `${minutes}m`;
}

function cleanDescription(value) {
  if (Array.isArray(value)) value = value[0];
  const text = String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 240 ? `${text.slice(0, 237).trimEnd()}…` : text;
}

function metadataYear(metadata, fallbackYear) {
  const raw = metadata?.year;
  const year = Number.parseInt(String(Array.isArray(raw) ? raw[0] : raw ?? ""), 10);
  return Number.isFinite(year) && year >= 1890 && year <= 2100 ? year : fallbackYear;
}

/**
 * Normalise one Archive metadata response to the site's title object
 * shape, so the existing card-row renderer can display it. Returns
 * null when the item has no playable MP4 (caller drops it).
 */
export function normalizeArchiveItem(payload, curated) {
  const identifier = curated?.identifier || payload?.metadata?.identifier || "";
  if (!identifier) return null;
  const file = pickPlayableFile(payload?.files);
  if (!file) return null;
  const metadata = payload?.metadata || {};
  const title = curated?.title || String(metadata.title || identifier);
  const year = metadataYear(metadata, curated?.year);
  return {
    subjectId: `archive-${identifier}`,
    archiveId: identifier,
    source: "archive",
    free: true,
    title,
    type: "movie",
    category: "movie",
    year,
    releaseDate: year ? `${year}-01-01` : "",
    runtime: formatArchiveRuntime(file.length),
    language: "English",
    kicker: "Public domain · Internet Archive",
    badge: "Free",
    image: archivePosterUrl(identifier),
    cover: { url: archivePosterUrl(identifier) },
    gradient: "linear-gradient(145deg, #1e293b, #0f172a 50%, #020617)",
    description: cleanDescription(metadata.description)
      || `${title} — a public-domain classic, free to watch on Ustream.`,
    genre: ["classic"],
    rating: null,
    authorizedPlayback: true,
    mimeType: "video/mp4",
    streamUrl: archiveStreamUrl(identifier, file.name),
  };
}

function normalizeServerVerifiedArchiveItem(payload, curated) {
  if (!payload || payload.ok === false || payload.playable === false) return null;
  const identifier = payload.identifier || curated?.identifier || "";
  const streamUrl = payload.streamUrl || "";
  if (!identifier || !streamUrl) return null;
  const meta = payload.metadata || {};
  const title = curated?.title || String(meta.title || identifier);
  const year = metadataYear(meta, curated?.year);
  return {
    subjectId: `archive-${identifier}`,
    archiveId: identifier,
    source: "archive",
    free: true,
    authorizedPlayback: true,
    title,
    type: "movie",
    category: "movie",
    year,
    releaseDate: year ? `${year}-01-01` : "",
    runtime: formatArchiveRuntime(meta.runtimeSeconds || meta.runtime || meta.length),
    language: "English",
    kicker: "Public domain · Internet Archive",
    badge: "Free",
    image: payload.posterUrl || archivePosterUrl(identifier),
    cover: { url: payload.posterUrl || archivePosterUrl(identifier) },
    gradient: "linear-gradient(145deg, #1e293b, #0f172a 50%, #020617)",
    description: cleanDescription(meta.description)
      || `${title} — a public-domain classic, free to watch on Ustream.`,
    genre: ["classic"],
    rating: null,
    mimeType: payload.mimeType || "video/mp4",
    streamUrl,
  };
}

export function createArchiveClient({
  films = CURATED_ARCHIVE_FILMS,
  verifyUrl = "",
  cache = null,
  fetchImpl = (typeof fetch !== "undefined" ? fetch.bind(globalThis) : null),
  timeoutMs = 8000,
  retries = 1,
  maxConcurrent = 3,
  backoffMs = 600,
  cacheTtlMs = 12 * 60 * 60 * 1000,
} = {}) {
  let active = 0;
  const queue = [];

  const acquire = () => new Promise((resolve) => {
    if (active < maxConcurrent) { active += 1; resolve(); } else queue.push(resolve);
  });
  const release = () => {
    const next = queue.shift();
    if (next) next(); else active -= 1;
  };

  async function fetchVerifiedViaServer(curated, signal) {
    if (!verifyUrl) return undefined;
    const cacheKey = `archive:verified:${curated.identifier}`;
    const cached = cache?.get(cacheKey);
    if (cached !== undefined) return cached;
    await acquire();
    try {
      const res = await fetchWithRetry(`${verifyUrl}?id=${encodeURIComponent(curated.identifier)}`, {
        timeoutMs, retries: 0, backoffMs, signal, fetchImpl,
      });
      const data = await res.json().catch(() => null);
      if (!data || typeof data !== "object") return undefined;
      cache?.set(cacheKey, data, cacheTtlMs);
      return data;
    } catch (error) {
      if (error?.status === 404 || error?.status === 422) {
        return { ok: false, playable: false };
      }
      return undefined;
    } finally {
      release();
    }
  }

  async function fetchMetadata(curated, signal) {
    const cacheKey = `archive:${curated.identifier}`;
    const cached = cache?.get(cacheKey);
    if (cached !== undefined) return cached;
    await acquire();
    try {
      const res = await fetchWithRetry(`${ARCHIVE_METADATA_BASE}${encodeURIComponent(curated.identifier)}`, {
        timeoutMs, retries, backoffMs, signal, fetchImpl,
      });
      const data = await res.json().catch(() => null);
      if (!data || typeof data !== "object") throw new Error("Invalid Archive response");
      cache?.set(cacheKey, data, cacheTtlMs);
      return data;
    } finally {
      release();
    }
  }

  /**
   * getFreeMovies() -> normalised, playable films in curated order.
   * Items that fail to verify (network error, no MP4, removed item)
   * are dropped individually; an empty array means "hide the row".
   */
  async function getFreeMovies({ signal } = {}) {
    const settled = await Promise.all(films.map(async (curated) => {
      try {
        if (verifyUrl) {
          const verified = await fetchVerifiedViaServer(curated, signal);
          if (verified !== undefined) {
            return normalizeServerVerifiedArchiveItem(verified, curated);
          }
        }
        const payload = await fetchMetadata(curated, signal);
        return normalizeArchiveItem(payload, curated);
      } catch {
        return null;
      }
    }));
    return settled.filter(Boolean);
  }

  return { getFreeMovies };
}
