import { handleAuthRoute } from "./auth-routes.js";
import { handleVideoRoute } from "./video-routes.js";

const ALLOWED_TMDB_PREFIXES = [
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

function sendJson(res, status, payload, headers = {}) {
  const common = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...headers,
  };
  if (typeof res.setHeader === "function") {
    for (const [key, value] of Object.entries(common)) res.setHeader(key, value);
  }
  if (typeof res.status === "function") {
    const response = res.status(status);
    if (response && typeof response.json === "function") return response.json(payload);
  }
  if (typeof res.json === "function") {
    res.statusCode = status;
    return res.json(payload);
  }
  if (typeof res.writeHead === "function") res.writeHead(status, common);
  if (typeof res.end === "function") return res.end(JSON.stringify(payload));
}

function resolveRequestUrl(req) {
  const headers = req.headers || {};
  let raw = headers["x-vercel-original-url"]
    || headers["x-forwarded-uri"]
    || headers["x-original-url"]
    || req.url
    || headers["x-matched-path"]
    || "/";
  if (/^\/api\/(?:index|server|\[\.\.\.slug\])/.test(raw)) {
    raw = headers["x-vercel-original-url"] || headers["x-forwarded-uri"] || headers["x-original-url"] || req.url || raw;
  }
  const url = new URL(raw, "http://localhost");
  if (req.query && typeof req.query === "object") {
    for (const [key, value] of Object.entries(req.query)) {
      if (!url.searchParams.has(key) && value !== undefined && value !== null) {
        url.searchParams.set(key, Array.isArray(value) ? value.join("/") : String(value));
      }
    }
  }
  const endpoint = url.searchParams.get("endpoint") || url.searchParams.get("path") || req.query?.endpoint || req.query?.path;
  if (endpoint) url.pathname = endpoint.startsWith("/") ? `/api${endpoint}` : `/api/${endpoint}`;
  else if (req.query?.slug) {
    const slug = Array.isArray(req.query.slug) ? req.query.slug.join("/") : req.query.slug;
    url.pathname = `/api/${slug}`;
  }
  if (!url.pathname.startsWith("/api")) url.pathname = `/api${url.pathname.startsWith("/") ? "" : "/"}${url.pathname}`;
  if (url.pathname.startsWith("/api/api/")) url.pathname = url.pathname.replace(/^\/api\/api\//, "/api/");
  url.pathname = url.pathname.replace(/\.js$/, "");
  return url;
}

function validTmdbPath(path) {
  return typeof path === "string"
    && path.startsWith("/")
    && !path.includes("..")
    && !/api_key/i.test(path)
    && /^\/[A-Za-z0-9\-_\/?.=&%+]+$/.test(path)
    && ALLOWED_TMDB_PREFIXES.some((prefix) => path.startsWith(prefix));
}

async function proxyTmdb(req, res, tmdbPath) {
  if (!validTmdbPath(tmdbPath)) {
    return sendJson(res, 400, { error: "Missing or invalid tmdbPath parameter" });
  }
  const apiKey = String(process.env.TMDB_API_KEY || "").trim();
  if (!apiKey) {
    return sendJson(res, 503, { error: "TMDB_API_KEY is not configured on the server" });
  }

  const separator = tmdbPath.includes("?") ? "&" : "?";
  const upstreamUrl = `https://api.themoviedb.org/3${tmdbPath}${separator}api_key=${encodeURIComponent(apiKey)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(upstreamUrl, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return sendJson(res, response.status, payload || { error: `TMDB upstream error ${response.status}` });
    }
    return sendJson(res, 200, payload, { "cache-control": "public, max-age=900, stale-while-revalidate=3600" });
  } catch (error) {
    const status = error?.name === "AbortError" ? 504 : 502;
    return sendJson(res, status, { error: "Failed to proxy TMDB request" });
  } finally {
    clearTimeout(timer);
  }
}

export const handler = async (req, res) => {
  const method = String(req.method || "GET").toUpperCase();
  try {
    const requestUrl = resolveRequestUrl(req);
    const pathname = requestUrl.pathname;

    if (method === "OPTIONS") {
      const origin = req.headers?.origin;
      const headers = {
        "access-control-allow-origin": origin || "*",
        "access-control-allow-headers": "content-type, authorization, accept",
        "access-control-allow-methods": "GET, HEAD, POST, PUT, DELETE, OPTIONS",
        ...(origin ? { "access-control-allow-credentials": "true" } : {}),
      };
      if (typeof res.setHeader === "function") {
        for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
      }
      if (typeof res.status === "function") {
        const response = res.status(204);
        if (response && typeof response.end === "function") return response.end();
      }
      if (typeof res.writeHead === "function") res.writeHead(204, headers);
      if (typeof res.end === "function") return res.end();
      return;
    }

    if (pathname === "/api/tmdb") {
      if (method !== "GET") return sendJson(res, 405, { error: "Method not allowed" });
      return await proxyTmdb(req, res, requestUrl.searchParams.get("tmdbPath") || "");
    }

    if (pathname === "/api" || pathname === "/api/") {
      if (!new Set(["GET", "HEAD"]).has(method)) return sendJson(res, 405, { error: "Method not allowed" });
      return sendJson(res, 200, { ok: true, service: "ustream" });
    }
    if (pathname === "/healthz" || pathname === "/api/healthz" || pathname === "/api/health") {
      return sendJson(res, 200, { ok: true, status: "healthy", service: "ustream" });
    }
    if (pathname === "/api/config") {
      if (!new Set(["GET", "HEAD"]).has(method)) return sendJson(res, 405, { error: "Method not allowed" });
      const configured = Boolean(String(process.env.TMDB_API_KEY || "").trim());
      return sendJson(res, 200, { ok: true, configured, tmdbApiKeyConfigured: configured, mode: configured ? "live" : "browser-fallback" });
    }

    if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/profile") || pathname.startsWith("/api/profiles")) {
      const handled = await handleAuthRoute(req, res, pathname);
      if (handled) return;
    }
    if (pathname.startsWith("/api/videos")) {
      const handled = await handleVideoRoute(req, res, pathname);
      if (handled) return;
    }

    return sendJson(res, 404, { error: "API route not found" });
  } catch (error) {
    console.error("[Ustream API]", error?.message || "request failed");
    return sendJson(res, error?.statusCode || 500, { error: error?.message || "Internal server error" });
  }
};

export default handler;
