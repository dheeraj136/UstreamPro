import { handleAuthRoute } from "./auth-routes.js";
import { handleVideoRoute } from "./video-routes.js";
import { applyCors, redactSecrets } from "./http-utils.js";
import configHandler from "../api/config.js";
import healthHandler from "../api/health.js";
import tmdbHandler from "../api/tmdb.js";
import archiveHandler from "../api/archive.js";
import animeworldHandler from "../api/animeworld.js";

function ensureVercelStyleResponse(res) {
  if (typeof res.status === "function" && typeof res.json === "function") {
    return res;
  }
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    if (typeof res.setHeader === "function") {
      res.setHeader("content-type", "application/json; charset=utf-8");
    }
    const body = JSON.stringify(payload);
    if (typeof res.end === "function") {
      return res.end(body);
    }
    return res;
  };
  return res;
}

function sendJson(req, res, status, payload, headers = {}) {
  const cors = applyCors(req, res, {
    methods: "GET, HEAD, POST, PUT, DELETE, OPTIONS",
    headers: "Content-Type, Authorization, Accept, Range, X-Filename, X-Title, X-Category, X-Description",
  });
  const common = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...cors,
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
      if (key === "slug" || key === "endpoint" || key === "path") continue;
      if (!url.searchParams.has(key) && value !== undefined && value !== null) {
        url.searchParams.set(key, Array.isArray(value) ? value.join("/") : String(value));
      }
    }
  }
  const endpoint = url.searchParams.get("endpoint") || url.searchParams.get("path") || req.query?.endpoint || req.query?.path;
  if (endpoint) {
    url.pathname = endpoint.startsWith("/") ? `/api${endpoint}` : `/api/${endpoint}`;
  } else if (req.query?.slug && (!url.pathname.startsWith("/api/") || url.pathname.startsWith("/api/[...slug]"))) {
    const slug = Array.isArray(req.query.slug) ? req.query.slug.join("/") : req.query.slug;
    url.pathname = `/api/${slug}`;
  }
  if (!url.pathname.startsWith("/api")) {
    url.pathname = `/api${url.pathname.startsWith("/") ? "" : "/"}${url.pathname}`;
  }
  if (url.pathname.startsWith("/api/api/")) {
    url.pathname = url.pathname.replace(/^\/api\/api\//, "/api/");
  }
  url.pathname = url.pathname.replace(/\.js$/, "");
  return url;
}

export const handler = async (req, res) => {
  ensureVercelStyleResponse(res);
  const method = String(req.method || "GET").toUpperCase();
  try {
    const requestUrl = resolveRequestUrl(req);
    const pathname = requestUrl.pathname.replace(/\/+$/, "") || "/api";
    if (typeof req === "object" && req) {
      req.url = `${pathname}${requestUrl.search}`;
    }

    if (method === "OPTIONS") {
      const headers = applyCors(req, res, {
        credentials: true,
        methods: "GET, HEAD, POST, PUT, DELETE, OPTIONS",
        headers: "Content-Type, Authorization, Accept, Range, X-Filename, X-Title, X-Category, X-Description",
        exposeHeaders: "Content-Range, Accept-Ranges, Content-Length",
      });
      if (typeof res.writeHead === "function" && typeof res.status !== "function") {
        res.writeHead(204, headers);
      } else {
        res.statusCode = 204;
      }
      if (typeof res.end === "function") return res.end();
      return;
    }

    if (pathname === "/api/tmdb") {
      if (!req.query) req.query = Object.fromEntries(requestUrl.searchParams.entries());
      return await tmdbHandler(req, res);
    }

    if (pathname === "/api/archive") {
      if (!req.query) req.query = Object.fromEntries(requestUrl.searchParams.entries());
      return await archiveHandler(req, res);
    }

    if (pathname === "/api/animeworld" || pathname.startsWith("/api/anime-world-india")) {
      if (!req.query) req.query = Object.fromEntries(requestUrl.searchParams.entries());
      return await animeworldHandler(req, res);
    }

    if (pathname === "/api" || pathname === "/api/") {
      if (!new Set(["GET", "HEAD"]).has(method)) return sendJson(req, res, 405, { error: "Method not allowed" });
      return sendJson(req, res, 200, { ok: true, service: "ustream" });
    }

    if (pathname === "/healthz" || pathname === "/api/healthz" || pathname === "/api/health") {
      return healthHandler(req, res);
    }

    if (pathname === "/api/config") {
      return configHandler(req, res);
    }

    if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/profile") || pathname.startsWith("/api/profiles")) {
      const handled = await handleAuthRoute(req, res, pathname);
      if (handled) return;
    }

    if (pathname.startsWith("/api/videos")) {
      const handled = await handleVideoRoute(req, res, pathname);
      if (handled) return;
    }

    return sendJson(req, res, 404, { error: "API route not found" });
  } catch (error) {
    console.error("[Ustream API]", redactSecrets(error?.message || "request failed"));
    return sendJson(req, res, error?.statusCode || 500, {
      error: redactSecrets(error?.message || "Internal server error"),
    });
  }
};

export default handler;
