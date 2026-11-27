import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createTtlCache } from "../src/modules/api-cache.js";
import { beginLoading, describeLoadError, fetchWithRetry, loaderHtml, stateHtml } from "../src/modules/loader.js";
import { createTmdbClient, TmdbError } from "../src/modules/tmdb-client.js";
import { TMDB_ATTRIBUTION, normalizeWatchProviders, pickRegion, watchHubHtml } from "../src/modules/watch-providers.js";
import { tmdbRatingFromVotes } from "../src/modules/ratings.js";
import tmdbHandler from "../api/tmdb.js";
import configHandler from "../api/config.js";
import routerHandler from "../api/router.js";
import { verifyArchiveIdentifier } from "../api/archive.js";
import { handler as localApiHandler } from "../lib/server.js";

function response(status, data, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers });
}

function mockRes() {
  return {
    statusCode: 0,
    headers: {},
    body: null,
    setHeader(key, value) { this.headers[key.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
    end() { return this; },
  };
}

test("shared loader markup announces loading and escapes labels", () => {
  const html = loaderHtml({ label: "Loading <titles>", size: "sm" });
  assert.match(html, /role="status"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /Loading &lt;titles&gt;/);
  assert.match(stateHtml({ kind: "error", title: "Unavailable", message: "Try again" }), /role="alert"/);
  assert.equal(describeLoadError({ status: 404 }), "This item could not be found.");
});

test("shared loader shows slow status and only the newest loader can finish", async () => {
  const attrs = new Set();
  const label = { textContent: "" };
  const container = {
    innerHTML: "",
    setAttribute(name) { attrs.add(name); },
    removeAttribute(name) { attrs.delete(name); },
    querySelector(selector) { return selector === ".ul-loader__label" ? label : null; },
  };
  const finishOld = beginLoading(container, { label: "First", slowAfterMs: 100 });
  const finishNew = beginLoading(container, { label: "Second", slowLabel: "Taking longer", slowAfterMs: 1 });
  await new Promise((resolve) => setTimeout(resolve, 8));
  assert.equal(label.textContent, "Taking longer");
  finishOld();
  assert.equal(attrs.has("aria-busy"), true);
  finishNew();
  assert.equal(attrs.has("aria-busy"), false);
});

test("TTL cache expires entries and bounds memory", () => {
  let now = 100;
  const cache = createTtlCache({ ttlMs: 20, maxEntries: 2, now: () => now });
  cache.set("a", { value: 1 });
  assert.deepEqual(cache.get("a"), { value: 1 });
  now = 121;
  assert.equal(cache.get("a"), undefined);
  cache.set("b", 2);
  cache.set("c", 3);
  cache.set("d", 4);
  assert.equal(cache.size, 2);
  assert.equal(cache.get("b"), undefined);
});

test("TMDB provider selection prefers India and falls back to United States", () => {
  const payload = {
    results: {
      IN: { link: "https://www.themoviedb.org/movie/1/watch", rent: [] },
      US: { link: "https://www.themoviedb.org/movie/1/watch", flatrate: [{ provider_id: 8, provider_name: "Service", display_priority: 1 }] },
      GB: { flatrate: [{ provider_id: 9, provider_name: "Ignored" }] },
    },
  };
  const hub = normalizeWatchProviders(payload);
  assert.equal(hub.region, "US");
  assert.equal(hub.fallbackUsed, true);
  assert.equal(hub.preferredMissing, "IN");
  assert.deepEqual(hub.regions, ["US"]);
  assert.equal(pickRegion(payload.results, ["IN", "US"]).region, "US");
  assert.match(watchHubHtml(hub, { title: "Example" }), /Nothing is listed for India/);
});

test("provider cards use only TMDB watch links and show an honest empty state", () => {
  const payload = { results: { IN: {
    link: "https://evil.example/redirect",
    flatrate: [{ provider_id: 1, provider_name: "Example Service", logo_path: "/logo.png" }],
  } } };
  const hub = normalizeWatchProviders(payload);
  assert.equal(hub.link, "");
  const html = watchHubHtml(hub, { title: "Example" });
  assert.match(html, /class="watch-provider"/);
  assert.doesNotMatch(html, /href="https:\/\/evil\.example/);
  assert.doesNotMatch(html, /href=""/);
  assert.match(html, /https:\/\/www\.justwatch\.com/);
  assert.ok(html.includes(TMDB_ATTRIBUTION));
  assert.ok(html.includes("JustWatch"));

  const empty = normalizeWatchProviders({ results: {
    IN: { link: "https://www.themoviedb.org/movie/123-example/watch?locale=IN" },
    US: {},
  } });
  assert.equal(empty.isEmpty, true);
  assert.equal(empty.link, "https://www.themoviedb.org/movie/123-example/watch?locale=IN");
  const emptyHtml = watchHubHtml(empty, { title: "Example" });
  assert.match(emptyHtml, /No authorised streaming, rental or purchase options/);
  assert.match(emptyHtml, /View Example on TMDB/);
  assert.match(emptyHtml, /Streaming availability data provided by/);
  assert.match(emptyHtml, /JustWatch/);
});

test("TMDB client falls back to direct API when proxy is unconfigured", async () => {
  const calls = [];
  const client = createTmdbClient({
    keys: ["unit-test-key"], retries: 0,
    fetchImpl: async (url) => {
      calls.push(String(url));
      if (String(url).startsWith("/api/tmdb")) return response(503, { error: "not configured" });
      return response(200, { results: [{ id: 1 }] });
    },
  });
  const result = await client.get("/movie/popular?page=1");
  assert.equal(result.results[0].id, 1);
  assert.equal(calls.length, 2);
  assert.match(calls[1], /^https:\/\/api\.themoviedb\.org\/3\/movie\/popular/);
  assert.equal(client.proxyAvailable, false);
});

test("TMDB client treats an old health stub as unavailable, not as content", async () => {
  let directCalled = false;
  const client = createTmdbClient({
    keys: ["unit-test-key"], retries: 0,
    fetchImpl: async (url) => {
      if (String(url).startsWith("/api/tmdb")) return response(200, { ok: true, service: "ustream", status: "healthy" });
      directCalled = true;
      return response(200, { results: [] });
    },
  });
  assert.deepEqual(await client.get("/tv/popular"), { results: [] });
  assert.equal(directCalled, true);
  assert.equal(client.proxyAvailable, false);
});

test("TMDB client reports TMDB not-found responses", async () => {
  const client = createTmdbClient({
    keys: ["unit-test-key"], retries: 0,
    fetchImpl: async () => response(404, { status_code: 34, status_message: "Not found" }),
  });
  await assert.rejects(client.get("/movie/999999999"), (error) => error instanceof TmdbError && error.status === 404);
});

test("transient 429 responses are retried", async () => {
  let calls = 0;
  const res = await fetchWithRetry("https://example.test/data", {
    retries: 1, backoffMs: 0, timeoutMs: 1000,
    fetchImpl: async () => ++calls === 1
      ? response(429, {}, { "Retry-After": "0" })
      : response(200, { ok: true }),
  });
  assert.equal(calls, 2);
  assert.equal((await res.json()).ok, true);
});

test("TMDB client deduplicates in-flight requests and caches results", async () => {
  let calls = 0;
  const client = createTmdbClient({
    keys: [], retries: 0, cache: createTtlCache(),
    fetchImpl: async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return response(200, { results: [{ id: 9 }] });
    },
  });
  const [a, b] = await Promise.all([client.get("/movie/popular"), client.get("/movie/popular")]);
  assert.deepEqual(a, b);
  assert.equal(calls, 1);
  await client.get("/movie/popular");
  assert.equal(calls, 1);
});

test("TMDB ratings require real TMDB vote data and never invent a fallback", () => {
  assert.equal(tmdbRatingFromVotes(8.7, 42), 8.7);
  assert.equal(tmdbRatingFromVotes(8.7, 0), null);
  assert.equal(tmdbRatingFromVotes(null, 4), null);
  assert.equal(tmdbRatingFromVotes(0, 4), null);
  assert.equal(tmdbRatingFromVotes("not-a-number", 5), null);
});

test("Vercel TMDB proxy returns 503 without a server key and rejects bad paths", async () => {
  const prior = process.env.TMDB_API_KEY;
  delete process.env.TMDB_API_KEY;
  try {
    let res = mockRes();
    await tmdbHandler({ method: "GET", query: { tmdbPath: "/movie/popular" } }, res);
    assert.equal(res.statusCode, 503);

    res = mockRes();
    await tmdbHandler({ method: "GET", query: { tmdbPath: "/movie/../secret" } }, res);
    assert.equal(res.statusCode, 400);
  } finally {
    if (prior === undefined) delete process.env.TMDB_API_KEY;
    else process.env.TMDB_API_KEY = prior;
  }
});

test("Vercel TMDB proxy returns mocked data without reflecting the key", async () => {
  const priorKey = process.env.TMDB_API_KEY;
  const priorFetch = globalThis.fetch;
  const secret = "unit-test-key-not-a-credential";
  process.env.TMDB_API_KEY = secret;
  globalThis.fetch = async (url) => {
    assert.match(String(url), new RegExp(encodeURIComponent(secret)));
    return response(200, { results: [{ id: 11 }] });
  };
  try {
    const res = mockRes();
    await tmdbHandler({ method: "GET", query: { tmdbPath: "/movie/popular" } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.results[0].id, 11);
    assert.equal(JSON.stringify(res.body).includes(secret), false);
  } finally {
    globalThis.fetch = priorFetch;
    if (priorKey === undefined) delete process.env.TMDB_API_KEY;
    else process.env.TMDB_API_KEY = priorKey;
  }
});

test("local /api/tmdb returns 503 without a key and proxies with a key", async () => {
  const priorKey = process.env.TMDB_API_KEY;
  const priorFetch = globalThis.fetch;
  delete process.env.TMDB_API_KEY;
  try {
    let res = mockRes();
    await localApiHandler({ method: "GET", url: "/api/tmdb?tmdbPath=%2Fmovie%2Fpopular", headers: {} }, res);
    assert.equal(res.statusCode, 503);

    process.env.TMDB_API_KEY = "local-test-key";
    globalThis.fetch = async () => response(200, { results: [{ id: 12 }] });
    res = mockRes();
    await localApiHandler({ method: "GET", url: "/api/tmdb?tmdbPath=%2Fmovie%2Fpopular", headers: {} }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.results[0].id, 12);
  } finally {
    globalThis.fetch = priorFetch;
    if (priorKey === undefined) delete process.env.TMDB_API_KEY;
    else process.env.TMDB_API_KEY = priorKey;
  }
});

test("removed playback sources and server selector are absent from app", async () => {
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const html = await readFile(new URL("../src/index.html", import.meta.url), "utf8");
  assert.doesNotMatch(app, /STREAM_SERVERS|gaiaflix|vidsrc/i);
  assert.doesNotMatch(html, /STREAM_SERVERS|gaiaflix|vidsrc|server-selector/i);
  assert.doesNotMatch(app, /getEmbedStreamUrl|loadPreviewDetails|fetchEpisodeList|getStreamForTitle/);
});

test("/api/config reports capabilities without leaking secrets", async () => {
  const priorKey = process.env.TMDB_API_KEY;
  process.env.TMDB_API_KEY = "super-secret-do-not-leak";
  try {
    const res = mockRes();
    await configHandler({ method: "GET", headers: {} }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.tmdbApiKeyConfigured, true);
    assert.equal(res.body.mode, "live");
    assert.ok(res.body.auth);
    assert.ok(res.body.uploads);
    assert.equal(JSON.stringify(res.body).includes("super-secret-do-not-leak"), false);
  } finally {
    if (priorKey === undefined) delete process.env.TMDB_API_KEY;
    else process.env.TMDB_API_KEY = priorKey;
  }
});

test("/api/archive verifies public-domain MP4 availability and rejects bad identifiers", async () => {
  const bad = await verifyArchiveIdentifier("../etc/passwd");
  assert.equal(bad.status, 400);
  assert.equal(bad.payload.playable, false);

  const ok = await verifyArchiveIdentifier("HisGirlFriday", {
    fetchImpl: async () => response(200, {
      metadata: { identifier: "HisGirlFriday", title: "His Girl Friday", year: 1940 },
      files: [{ name: "HisGirlFriday.mp4", format: "h.264", size: 12345, length: 5290 }],
    }),
  });
  assert.equal(ok.status, 200);
  assert.equal(ok.payload.playable, true);
  assert.equal(ok.payload.mimeType, "video/mp4");
  assert.match(ok.payload.streamUrl, /^https:\/\/archive\.org\/download\/HisGirlFriday\//);

  const noMp4 = await verifyArchiveIdentifier("AudioOnlyItem", {
    fetchImpl: async () => response(200, {
      metadata: { identifier: "AudioOnlyItem" },
      files: [{ name: "audio.mp3", format: "VBR MP3", size: 1000 }],
    }),
  });
  assert.equal(noMp4.status, 422);
  assert.equal(noMp4.payload.playable, false);
});

test("/api/router handles Vercel rewrite endpoint queries for auth and videos", async () => {
  const priorVercel = process.env.VERCEL;
  process.env.VERCEL = "1";
  try {
    const meRes = mockRes();
    await routerHandler({ method: "GET", url: "/api/router?endpoint=/auth/me", headers: {}, query: { endpoint: "/auth/me" } }, meRes);
    assert.equal(meRes.statusCode, 200);
    assert.equal(meRes.body.ok, true);
    assert.equal(meRes.body.authAvailable, false);

    const streamRes = mockRes();
    await routerHandler({ method: "GET", url: "/api/router?endpoint=/videos/stream/missing", headers: {}, query: { endpoint: "/videos/stream/missing" } }, streamRes);
    assert.equal(streamRes.statusCode, 404);
  } finally {
    if (priorVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = priorVercel;
  }
});
