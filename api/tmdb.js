// UstreamPro TMDB proxy — Vercel serverless function.
//
// GET /api/tmdb?tmdbPath=/movie/popular&page=1
//
// Proxies a TMDB API v3 read-only request using the TMDB_API_KEY
// environment variable, so the key is never shipped to the browser.
// The key must be set in Vercel (Project Settings -> Environment
// Variables -> TMDB_API_KEY). When it is not set the function answers
// 503 and the client falls back to its built-in keys, so the site
// keeps working without the env var.
//
// TMDB API terms: free API key, attribution required — "This product
// uses the TMDB API but is not endorsed or certified by TMDB."
// Watch-provider data comes from JustWatch, via TMDB.
// Only read-only TMDB v3 paths are allowed; no api_key parameter is
// ever accepted from the caller.

const ALLOWED_PREFIXES = [
  "/movie/",
  "/tv/",
  "/search/",
  "/trending/",
  "/discover/",
  "/genre/",
  "/person/",
  "/collection/",
  "/company/",
  "/keyword/",
  "/watch/",
];

function isAllowedTmdbPath(path) {
  if (typeof path !== "string" || !path.startsWith("/")) return false;
  if (path.includes("..") || /api_key/i.test(path)) return false;
  if (!/^\/[A-Za-z0-9\-_\/?.=&%+]+$/.test(path)) return false;
  return ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Only GET is supported." });
  }

  const tmdbPath = req.query?.tmdbPath
    || (typeof req.url === "string" ? new URL(req.url, "http://localhost").searchParams.get("tmdbPath") : "");
  if (!tmdbPath || !isAllowedTmdbPath(tmdbPath)) {
    return res.status(400).json({ error: "Missing or invalid tmdbPath parameter" });
  }

  const apiKey = (process.env.TMDB_API_KEY || "").trim();
  if (!apiKey) {
    return res.status(503).json({ error: "TMDB_API_KEY is not configured on the server" });
  }

  const sep = tmdbPath.includes("?") ? "&" : "?";
  const upstreamUrl = `https://api.themoviedb.org/3${tmdbPath}${sep}api_key=${encodeURIComponent(apiKey)}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    let upstreamRes;
    try {
      upstreamRes = await fetch(upstreamUrl, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
    } finally {
      clearTimeout(timer);
    }
    const data = await upstreamRes.json().catch(() => null);
    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json(data || { error: `TMDB upstream error ${upstreamRes.status}` });
    }
    // TMDB allows reasonable caching. Watch-provider data is supplied by
    // JustWatch; the client also applies a bounded 12-hour cache.
    res.setHeader("Cache-Control", "public, max-age=900, s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: "Failed to proxy TMDB request", message: err?.message || "upstream fetch failed" });
  }
}
