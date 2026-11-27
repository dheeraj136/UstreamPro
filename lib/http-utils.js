// Shared HTTP, CORS, capability, range, and redaction helpers for UstreamPro APIs.

export const ALLOWED_VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".ogg", ".mov"]);
export const ALLOWED_VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
]);
export const MAX_VIDEO_BYTES = 150 * 1024 * 1024; // 150 MB

export function isServerlessRuntime() {
  return Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT ||
    (process.env.NODE_ENV === "production" && !process.env.LOCAL_DEV && process.env.NODE_ENV !== "test")
  );
}

export function getServerCapabilities() {
  const isVercel = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT
  );
  const tmdbKey = String(process.env.TMDB_API_KEY || "").trim();
  const tmdbToken = String(process.env.TMDB_ACCESS_TOKEN || "").trim();
  const tmdbConfigured = Boolean(tmdbKey || tmdbToken);

  const googleClientId = String(process.env.GOOGLE_CLIENT_ID || "").trim();
  const googleClientSecret = String(process.env.GOOGLE_CLIENT_SECRET || "").trim();
  const googleOAuthEnabled = Boolean(googleClientId && googleClientSecret);

  const blobConfigured = Boolean(String(process.env.BLOB_READ_WRITE_TOKEN || "").trim());
  const ephemeralAuthEnabled = process.env.USTREAM_ENABLE_EPHEMERAL_AUTH === "1";

  const authEnabled = !isVercel || ephemeralAuthEnabled;
  const authPersistence = isVercel
    ? (ephemeralAuthEnabled ? "ephemeral" : "unconfigured")
    : "local";

  const uploadsEnabled = !isVercel || blobConfigured;
  const uploadMode = isVercel
    ? (blobConfigured ? "vercel-blob" : "disabled")
    : "local";

  return {
    ok: true,
    service: "ustream",
    configured: tmdbConfigured,
    tmdbApiKeyConfigured: tmdbConfigured,
    mode: tmdbConfigured ? "live" : "unconfigured",
    auth: {
      enabled: authEnabled,
      persistence: authPersistence,
      googleOAuthEnabled: authEnabled && googleOAuthEnabled,
    },
    uploads: {
      enabled: uploadsEnabled,
      mode: uploadMode,
      maxBytes: uploadsEnabled ? (isVercel ? 4.5 * 1024 * 1024 : MAX_VIDEO_BYTES) : 0,
      allowedExtensions: [...ALLOWED_VIDEO_EXTENSIONS],
      allowedMimeTypes: [...ALLOWED_VIDEO_MIME_TYPES],
    },
    archive: {
      serverVerification: true,
      endpoint: "/api/archive",
    },
  };
}

export function isAllowedOrigin(origin) {
  if (!origin || typeof origin !== "string") return false;
  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  if (parsed.protocol === "http:" && (host === "localhost" || host === "127.0.0.1")) {
    return true;
  }
  if (parsed.protocol === "https:") {
    if (host === "ustream-pro.vercel.app") return true;
    if (/^ustream-pro-[a-z0-9-]+\.vercel\.app$/.test(host)) return true;
    if (process.env.VERCEL_URL && host === process.env.VERCEL_URL.toLowerCase()) return true;
    if (process.env.VERCEL_BRANCH_URL && host === process.env.VERCEL_BRANCH_URL.toLowerCase()) return true;
  }
  const extra = String(process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return extra.includes(origin.toLowerCase());
}

export function getCorsHeaders(req, {
  methods = "GET, HEAD, OPTIONS",
  headers = "Content-Type, Accept",
  credentials = false,
  exposeHeaders = "",
} = {}) {
  const origin = req?.headers?.origin;
  const out = {
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": headers,
  };
  if (exposeHeaders) {
    out["Access-Control-Expose-Headers"] = exposeHeaders;
  }
  if (credentials) {
    if (origin && isAllowedOrigin(origin)) {
      out["Access-Control-Allow-Origin"] = origin;
      out["Access-Control-Allow-Credentials"] = "true";
      out["Vary"] = "Origin";
    } else if (origin) {
      out["Vary"] = "Origin";
    }
  } else {
    out["Access-Control-Allow-Origin"] = origin && isAllowedOrigin(origin) ? origin : "*";
    if (origin) out["Vary"] = "Origin";
  }
  return out;
}

export function applyCors(req, res, options = {}) {
  const corsHeaders = getCorsHeaders(req, options);
  if (typeof res?.setHeader === "function") {
    for (const [k, v] of Object.entries(corsHeaders)) {
      res.setHeader(k, v);
    }
  }
  return corsHeaders;
}

export function redactSecrets(input) {
  return String(input ?? "")
    .replace(/([?&](?:api_key|token|access_token|client_secret|sig|signature|X-Amz-Signature)=)[^&\s"']+/gi, "$1[REDACTED]")
    .replace(/(Bearer\s+)[A-Za-z0-9._\-]+/gi, "$1[REDACTED]");
}

export function getRequestOrigin(req) {
  const headers = req?.headers || {};
  const rawProto = String(headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const proto = rawProto || (req?.socket?.encrypted || req?.connection?.encrypted ? "https" : "http");
  const rawHost = String(headers["x-forwarded-host"] || headers.host || "").split(",")[0].trim();
  if (!rawHost) return "";
  return `${proto}://${rawHost}`;
}

/**
 * Parse an HTTP Range header (`bytes=start-end`, `bytes=start-`, `bytes=-suffix`)
 * per RFC 9110. Returns:
 * - null if no Range header
 * - { valid: false } if malformed or unsatisfiable (416)
 * - { valid: true, start, end } if valid
 */
export function parseByteRange(rangeHeader, totalSize) {
  if (!rangeHeader || typeof rangeHeader !== "string") return null;
  if (!Number.isFinite(totalSize) || totalSize <= 0) return { valid: false };
  const match = rangeHeader.trim().match(/^bytes=(\d*)-(\d*)$/i);
  if (!match) return { valid: false };

  const [, startStr, endStr] = match;
  if (startStr === "" && endStr === "") return { valid: false };

  let start;
  let end;
  if (startStr === "") {
    // Suffix-byte-range-spec: bytes=-500
    const suffix = Number.parseInt(endStr, 10);
    if (!Number.isFinite(suffix) || suffix <= 0) return { valid: false };
    start = Math.max(0, totalSize - suffix);
    end = totalSize - 1;
  } else {
    start = Number.parseInt(startStr, 10);
    end = endStr === "" ? totalSize - 1 : Number.parseInt(endStr, 10);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= totalSize || end < start) {
      return { valid: false };
    }
    end = Math.min(end, totalSize - 1);
  }

  return { valid: true, start, end };
}
