// TMDB API v3 client (read-only).
//
// Order of attempts for every request:
//   1. /api/tmdb proxy (api/tmdb.js on Vercel, lib/server.js locally),
//      which adds the TMDB_API_KEY env var server-side.
//   2. Direct api.themoviedb.org with the client's fallback keys, used
//      only when the proxy is not configured (503) or not reachable.
// Responses are cached (TTL), identical in-flight requests are shared,
// transient failures (network, 429, 5xx) are retried with backoff, and
// concurrency is capped so a page of cards never floods TMDB.
//
// Attribution (TMDB terms): "This product uses the TMDB API but is not
// endorsed or certified by TMDB" — shown in the footer and detail view.

import { fetchWithRetry } from "./loader.js";

export class TmdbError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "TmdbError";
    this.status = status;
  }
}

export function normalizeTmdbPath(path) {
  const p = String(path || "");
  return (p.startsWith("/") ? p : `/${p}`).replace(/([?&]language=en)(?=&|$)/g, "$1-US");
}

// An older deployment may answer a missing API route with the health
// document; treat that response as "proxy unavailable", not TMDB data.
function isHealthStub(data) {
  return Boolean(data) && data.service === "ustream" && data.status === "healthy";
}

export function createTmdbClient({
  proxyUrl = "/api/tmdb",
  keys = [],
  cache = null,
  fetchImpl = (typeof fetch !== "undefined" ? fetch.bind(globalThis) : null),
  timeoutMs = 7000,
  retries = 1,
  maxConcurrent = 6,
  backoffMs = 500,
} = {}) {
  let proxyAvailable = Boolean(proxyUrl);
  const inflight = new Map();
  let active = 0;
  const queue = [];

  const acquire = () => new Promise((resolve) => {
    if (active < maxConcurrent) { active += 1; resolve(); } else queue.push(resolve);
  });
  const release = () => {
    const next = queue.shift();
    if (next) next(); else active -= 1;
  };

  async function viaProxy(path, signal) {
    const url = `${proxyUrl}?tmdbPath=${encodeURIComponent(path)}`;
    let res;
    try {
      res = await fetchWithRetry(url, { timeoutMs, retries, backoffMs, signal, fetchImpl });
    } catch (error) {
      if (signal?.aborted) throw error;
      if (error.status === 404) {
        const body = await error.response?.json?.().catch(() => null);
        // TMDB's own "resource not found" (status_code 34) is an answer.
        if (body && (body.status_code === 34 || body.status_message)) throw new TmdbError("Not found", 404);
      }
      // Only fall back to direct keys if keys are actually configured.
      // When no client keys exist (production default), keep proxyAvailable
      // enabled so retries and subsequent requests still use /api/tmdb.
      if (keys.length > 0) {
        proxyAvailable = false;
        return undefined; // fall back to direct
      }
      throw new TmdbError(error.message || "TMDB proxy request failed", error.status || 503);
    }
    const data = await res.json().catch(() => undefined);
    if (data === undefined || isHealthStub(data)) {
      if (keys.length > 0) {
        proxyAvailable = false;
        return undefined;
      }
      throw new TmdbError("TMDB proxy returned an invalid response", 502);
    }
    return data;
  }

  async function direct(path, signal) {
    let lastError = new TmdbError("TMDB is not reachable", 0);
    for (const key of keys) {
      const sep = path.includes("?") ? "&" : "?";
      try {
        const res = await fetchWithRetry(`https://api.themoviedb.org/3${path}${sep}api_key=${encodeURIComponent(key)}`, {
          timeoutMs, retries, backoffMs, signal, fetchImpl,
        });
        return await res.json();
      } catch (error) {
        if (signal?.aborted) throw error;
        if (error.status === 404) throw new TmdbError("Not found", 404);
        lastError = new TmdbError(error.message || "TMDB request failed", error.status || 0);
        // 401 (bad key) / transient: try the next key.
      }
    }
    throw lastError;
  }

  async function request(path, signal) {
    await acquire();
    try {
      if (proxyAvailable) {
        const data = await viaProxy(path, signal);
        if (data !== undefined) return data;
      }
      if (!keys.length) throw new TmdbError("TMDB is not configured", 503);
      return await direct(path, signal);
    } finally {
      release();
    }
  }

  /**
   * get(path, { signal, ttlMs }) -> parsed JSON. Throws TmdbError on
   * failure (status 404 = not found, 0 = network).
   */
  async function get(rawPath, { signal, ttlMs } = {}) {
    const path = normalizeTmdbPath(rawPath);
    const cached = cache?.get(path);
    if (cached !== undefined) return cached;
    let shared = inflight.get(path);
    if (!shared) {
      // The shared request is not tied to one caller's signal, so one
      // caller aborting does not cancel it for the others.
      shared = request(path, undefined)
        .then((data) => { cache?.set(path, data, ttlMs); return data; })
        .finally(() => inflight.delete(path));
      inflight.set(path, shared);
    }
    if (!signal) return shared;
    if (signal.aborted) throw Object.assign(new Error("aborted"), { name: "AbortError" });
    return await new Promise((resolve, reject) => {
      const onAbort = () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
      signal.addEventListener("abort", onAbort, { once: true });
      shared.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
    });
  }

  return {
    get,
    /** Legacy helper: resolves null instead of throwing. */
    async getOrNull(path, options) {
      try { return await get(path, options); } catch { return null; }
    },
    get proxyAvailable() { return proxyAvailable; },
  };
}
