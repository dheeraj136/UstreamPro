// UstreamPro TMDB proxy — Vercel serverless function.
//
// GET /api/tmdb?tmdbPath=/movie/popular&page=1
//
// Proxies a TMDB API v3 read-only request using TMDB_API_KEY (or
// TMDB_ACCESS_TOKEN Bearer) environment variables, so credentials are
// never shipped to the browser.
//
// TMDB API terms: free API key, attribution required — "This product
// uses the TMDB API but is not endorsed or certified by TMDB."
// Watch-provider data comes from JustWatch, via TMDB.
// Only read-only TMDB v3 paths are allowed; no api_key parameter is
// ever accepted from the caller.
import { applyCors, redactSecrets } from "../lib/http-utils.js";

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

export function isAllowedTmdbPath(path) {
  if (typeof path !== "string" || !path.startsWith("/")) return false;
  if (path.includes("..") || /api_key/i.test(path)) return false;
  if (!/^\/[A-Za-z0-9\-_\/?.=&%+]+$/.test(path)) return false;
  if (path === "/configuration" || path.startsWith("/configuration/")) return true;
  return ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export default async function handler(req, res) {
  applyCors(req, res, {
    methods: "GET, HEAD, OPTIONS",
    headers: "Content-Type, Accept",
  });
  res.setHeader("Cache-Control", "no-store");

  const method = String(req.method || "GET").toUpperCase();
  if (method === "OPTIONS") {
    return res.status(204).end();
  }
  if (method !== "GET" && method !== "HEAD") {
    return res.status(405).json({ error: "Method not allowed. Only GET is supported." });
  }

  const tmdbPath = req.query?.tmdbPath
    || (typeof req.url === "string" ? new URL(req.url, "http://localhost").searchParams.get("tmdbPath") : "");
  if (!tmdbPath || !isAllowedTmdbPath(tmdbPath)) {
    return res.status(400).json({ error: "Missing or invalid tmdbPath parameter" });
  }

  const apiKey = String(process.env.TMDB_API_KEY || "").trim();
  const accessToken = String(process.env.TMDB_ACCESS_TOKEN || "").trim();
  if (!apiKey && !accessToken) {
    return res.status(503).json({ error: "TMDB_API_KEY is not configured on the server" });
  }

  const sep = tmdbPath.includes("?") ? "&" : "?";
  const upstreamUrl = apiKey
    ? `https://api.themoviedb.org/3${tmdbPath}${sep}api_key=${encodeURIComponent(apiKey)}`
    : `https://api.themoviedb.org/3${tmdbPath}`;
  const headers = { Accept: "application/json" };
  if (!apiKey && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    let upstreamRes;
    try {
      upstreamRes = await fetch(upstreamUrl, {
        signal: controller.signal,
        headers,
      });
    } finally {
      clearTimeout(timer);
    }
    const data = await upstreamRes.json().catch(() => null);
    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json(data || { error: `TMDB upstream error ${upstreamRes.status}` });
    }
    res.setHeader("Cache-Control", "public, max-age=900, s-maxage=3600, stale-while-revalidate=86400");
    if (method === "HEAD") return res.status(200).end();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({
      error: "Failed to proxy TMDB request",
      message: redactSecrets(err?.message || "upstream fetch failed"),
    });
  }
}
