// Server-assisted Internet Archive public-domain verification endpoint.
//
// GET /api/archive?id=<identifier>[&verifyStream=1]
//
// Verifies that an archive.org item exists and exposes a browser-playable
// MP4 derivative (preferring h.264 MP4, then 512kb MP4, then MPEG4 MP4).
import { applyCors, redactSecrets } from "../lib/http-utils.js";

const ARCHIVE_METADATA_BASE = "https://archive.org/metadata/";
const ARCHIVE_DOWNLOAD_BASE = "https://archive.org/download/";
const VALID_IDENTIFIER_RE = /^[A-Za-z0-9._-]{1,128}$/;

function formatScore(file) {
  const format = String(file?.format || "").toLowerCase();
  const name = String(file?.name || "").toLowerCase();
  if (!name.endsWith(".mp4")) return -1;
  if (format.includes("h.264")) return 3;
  if (format.includes("512kb")) return 2;
  if (format.includes("mpeg4") || format.includes("mp4")) return 1;
  return 0;
}

export function pickPlayableArchiveFile(files) {
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

function cleanDescription(value) {
  if (Array.isArray(value)) value = value[0];
  const text = String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 240 ? `${text.slice(0, 237).trimEnd()}…` : text;
}

export async function verifyArchiveIdentifier(identifier, { verifyStream = false, fetchImpl = fetch } = {}) {
  if (!VALID_IDENTIFIER_RE.test(identifier)) {
    return { status: 400, payload: { ok: false, playable: false, error: "Invalid Archive identifier" } };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  let metaRes;
  try {
    metaRes = await fetchImpl(`${ARCHIVE_METADATA_BASE}${encodeURIComponent(identifier)}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
  } finally {
    clearTimeout(timer);
  }

  if (!metaRes.ok) {
    return {
      status: metaRes.status === 404 ? 404 : 502,
      payload: { ok: false, identifier, playable: false, error: `Archive metadata returned HTTP ${metaRes.status}` },
    };
  }

  const data = await metaRes.json().catch(() => null);
  if (!data || typeof data !== "object") {
    return { status: 502, payload: { ok: false, identifier, playable: false, error: "Invalid Archive metadata payload" } };
  }

  const file = pickPlayableArchiveFile(data.files);
  if (!file) {
    return { status: 422, payload: { ok: false, identifier, playable: false, error: "No browser-playable MP4 found" } };
  }

  const streamUrl = `${ARCHIVE_DOWNLOAD_BASE}${encodeURIComponent(identifier)}/${encodeURIComponent(file.name)}`;
  const posterUrl = `${ARCHIVE_DOWNLOAD_BASE}${encodeURIComponent(identifier)}/__ia_thumb.jpg`;

  let contentType = "video/mp4";
  let contentLength = Number(file.size) || null;
  let acceptRanges = "bytes";
  let streamChecked = false;

  if (verifyStream) {
    const headCtrl = new AbortController();
    const headTimer = setTimeout(() => headCtrl.abort(), 2500);
    try {
      const headRes = await fetchImpl(streamUrl, {
        method: "HEAD",
        redirect: "follow",
        signal: headCtrl.signal,
      });
      if (!headRes.ok) {
        return {
          status: 422,
          payload: { ok: false, identifier, playable: false, error: `Archive stream check failed (${headRes.status})` },
        };
      }
      contentType = headRes.headers?.get?.("content-type") || contentType;
      const cl = Number(headRes.headers?.get?.("content-length"));
      if (Number.isFinite(cl) && cl > 0) contentLength = cl;
      acceptRanges = headRes.headers?.get?.("accept-ranges") || acceptRanges;
      streamChecked = true;
    } catch {
      streamChecked = false;
    } finally {
      clearTimeout(headTimer);
    }
  }

  const meta = data.metadata || {};
  const rawYear = Array.isArray(meta.year) ? meta.year[0] : meta.year;
  const parsedYear = Number.parseInt(String(rawYear ?? ""), 10);

  return {
    status: 200,
    payload: {
      ok: true,
      identifier,
      playable: true,
      streamChecked,
      streamUrl,
      posterUrl,
      mimeType: contentType.split(";")[0].trim() || "video/mp4",
      fileSize: contentLength,
      acceptRanges,
      metadata: {
        title: String(Array.isArray(meta.title) ? meta.title[0] : meta.title || identifier),
        year: Number.isFinite(parsedYear) ? parsedYear : null,
        description: cleanDescription(meta.description),
        runtimeSeconds: Number(file.length) || null,
      },
    },
  };
}

export default async function handler(req, res) {
  applyCors(req, res, {
    methods: "GET, HEAD, OPTIONS",
    headers: "Content-Type, Accept",
  });
  res.setHeader("Cache-Control", "no-store");

  const method = String(req.method || "GET").toUpperCase();
  if (method === "OPTIONS") return res.status(204).end();
  if (method !== "GET" && method !== "HEAD") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const urlObj = typeof req.url === "string" ? new URL(req.url, "http://localhost") : null;
  const id = String(req.query?.id || urlObj?.searchParams.get("id") || "").trim();
  const verifyStream = (req.query?.verifyStream || urlObj?.searchParams.get("verifyStream")) === "1";

  if (!id) {
    return res.status(400).json({ ok: false, playable: false, error: "Missing id query parameter" });
  }

  try {
    const result = await verifyArchiveIdentifier(id, { verifyStream });
    if (result.status === 200) {
      res.setHeader("Cache-Control", "public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400");
    }
    if (method === "HEAD") return res.status(result.status).end();
    return res.status(result.status).json(result.payload);
  } catch (err) {
    return res.status(502).json({
      ok: false,
      identifier: id,
      playable: false,
      error: redactSecrets(err?.message || "Archive verification failed"),
    });
  }
}
