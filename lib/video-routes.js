import { createWriteStream, existsSync, mkdirSync, statSync, createReadStream, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join, resolve, extname } from "node:path";
import { getDb } from "./db.js";
import {
  createVideo,
  getVideoById,
  listVideos,
  incrementVideoViews,
  deleteVideo,
  validateVideoUpload,
  generateThumbnailSvg,
  sanitizeUploadFilename,
  sanitizeCategory,
  normalizeVideoMimeType,
  MAX_VIDEO_SIZE
} from "./video-service.js";
import { parseCookies, validateSession } from "./auth-service.js";
import { getCorsHeaders, getServerCapabilities, parseByteRange } from "./http-utils.js";

const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT
);
const BASE_DATA_DIR = isServerless ? "/tmp" : join(process.cwd(), "data");
const UPLOAD_DIR = resolve(BASE_DATA_DIR, "uploads", "videos");
const THUMB_DIR = resolve(BASE_DATA_DIR, "uploads", "thumbnails");

try {
  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
} catch {}
try {
  if (!existsSync(THUMB_DIR)) mkdirSync(THUMB_DIR, { recursive: true });
} catch {}

function sendJson(res, status, payload, req = null) {
  const cors = getCorsHeaders(req, {
    credentials: true,
    methods: "GET, POST, PUT, DELETE, OPTIONS, HEAD",
    headers: "Content-Type, Authorization, Range, X-Filename, X-Title, X-Category, X-Description",
  });
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store, no-cache, must-revalidate",
    ...cors,
  };
  if (typeof res.setHeader === "function") {
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  }

  if (typeof res.writeHead === "function") {
    res.writeHead(status, headers);
    return res.end(JSON.stringify(payload));
  }

  if (typeof res.status === "function") {
    return res.status(status).json(payload);
  }

  res.statusCode = status;
  return res.end(JSON.stringify(payload));
}

function getAuthFromReq(db, req) {
  const cookieHeader = req.headers?.cookie || "";
  const cookies = parseCookies(cookieHeader);
  let token = cookies["ustream_session"];
  if (!token && req.headers?.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.slice(7).trim();
  }
  if (!token) return null;
  return validateSession(db, token);
}

function decodeHeaderValue(raw, fallback = "") {
  if (!raw) return fallback;
  try {
    return decodeURIComponent(String(raw));
  } catch {
    return String(raw);
  }
}

async function readUploadStreamToDisk(req, targetPath, maxBytes) {
  const writeStream = createWriteStream(targetPath);
  let totalBytes = 0;

  return await new Promise((resolvePromise, rejectPromise) => {
    let settled = false;
    const fail = (err) => {
      if (settled) return;
      settled = true;
      writeStream.destroy();
      try { if (existsSync(targetPath)) unlinkSync(targetPath); } catch {}
      rejectPromise(err);
    };

    req.on("data", (chunk) => {
      if (settled) return;
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        if (typeof req.pause === "function") req.pause();
        fail(Object.assign(new Error(`File size exceeds ${Math.round(maxBytes / (1024 * 1024))}MB limit`), { statusCode: 413 }));
        return;
      }
      writeStream.write(chunk);
    });

    req.on("end", () => {
      if (settled) return;
      writeStream.end(() => {
        if (settled) return;
        settled = true;
        resolvePromise(totalBytes);
      });
    });

    req.on("error", (err) => fail(err));
    writeStream.on("error", (err) => fail(err));
  });
}

async function readUploadBuffer(req, maxBytes) {
  const chunks = [];
  let totalBytes = 0;
  return await new Promise((resolvePromise, rejectPromise) => {
    let settled = false;
    req.on("data", (chunk) => {
      if (settled) return;
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        settled = true;
        if (typeof req.pause === "function") req.pause();
        rejectPromise(Object.assign(new Error(`File size exceeds ${Math.round(maxBytes / (1024 * 1024))}MB limit`), { statusCode: 413 }));
        return;
      }
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on("end", () => {
      if (settled) return;
      settled = true;
      resolvePromise(Buffer.concat(chunks));
    });
    req.on("error", (err) => {
      if (settled) return;
      settled = true;
      rejectPromise(err);
    });
  });
}

async function uploadToVercelBlob(pathname, buffer, contentType) {
  const token = String(process.env.BLOB_READ_WRITE_TOKEN || "").trim();
  const res = await fetch(`https://blob.vercel-storage.com/${pathname}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "x-content-type": contentType,
      "x-api-version": "7",
    },
    body: buffer,
  });
  if (!res.ok) {
    throw new Error(`Blob upload failed with status ${res.status}`);
  }
  const data = await res.json();
  if (!data?.url) throw new Error("Blob upload response missing URL");
  return data.url;
}

export async function handleVideoRoute(req, res, pathname, dbOverride = null) {
  let cachedDb = dbOverride;
  const resolveDb = () => (cachedDb ||= getDb());
  const method = req.method.toUpperCase();
  const route = pathname.replace(/\/$/, "");
  const capabilities = getServerCapabilities();

  // CORS preflight
  if (method === "OPTIONS" && route.startsWith("/api/videos")) {
    const headers = getCorsHeaders(req, {
      credentials: true,
      methods: "GET, POST, DELETE, OPTIONS, HEAD",
      headers: "Content-Type, Authorization, Range, X-Filename, X-Title, X-Category, X-Description",
      exposeHeaders: "Content-Range, Accept-Ranges, Content-Length",
    });
    if (typeof res.writeHead === "function") {
      res.writeHead(204, headers);
      return res.end();
    }
    if (typeof res.setHeader === "function") {
      for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
    }
    res.statusCode = 204;
    return res.end();
  }

  // 1. GET /api/videos - List public videos
  if ((method === "GET" || method === "HEAD") && route === "/api/videos") {
    if (!dbOverride && !capabilities.uploads.enabled) {
      return sendJson(res, 200, { ok: true, count: 0, videos: [], storageConfigured: false }, req);
    }
    const urlObj = new URL(req.url, "http://localhost");
    const category = urlObj.searchParams.get("category") || "all";
    const status = urlObj.searchParams.get("status") || "ready";
    const limit = parseInt(urlObj.searchParams.get("limit") || "50", 10);
    const offset = parseInt(urlObj.searchParams.get("offset") || "0", 10);
    const userId = urlObj.searchParams.get("userId") || null;

    const videos = listVideos(resolveDb(), { category, status, limit, offset, userId });
    return sendJson(res, 200, { ok: true, count: videos.length, videos, storageConfigured: true }, req);
  }

  // 2. POST /api/videos/upload - Video Upload & Processing
  if (method === "POST" && route === "/api/videos/upload") {
    if (!dbOverride && !capabilities.uploads.enabled) {
      return sendJson(res, 503, {
        ok: false,
        error: "Community video uploads require persistent object storage (BLOB_READ_WRITE_TOKEN) on Vercel.",
        code: "UPLOAD_STORAGE_UNCONFIGURED",
      }, req);
    }

    const db = resolveDb();
    const auth = getAuthFromReq(db, req);
    if (!auth) {
      return sendJson(res, 401, { ok: false, error: "Authentication required to upload videos" }, req);
    }

    const rawContentType = req.headers["content-type"] || "";
    const normMime = normalizeVideoMimeType(rawContentType);
    const rawFilename = decodeHeaderValue(req.headers["x-filename"] || req.headers["x-file-name"], "video.mp4");
    const filename = sanitizeUploadFilename(rawFilename);
    const title = decodeHeaderValue(req.headers["x-title"], filename.replace(/\.[^/.]+$/, "")).trim();
    const category = sanitizeCategory(decodeHeaderValue(req.headers["x-category"], "movies"));
    const description = decodeHeaderValue(req.headers["x-description"], "");

    const contentLengthHeader = Number(req.headers["content-length"]);
    const maxBytes = capabilities.uploads.maxBytes || MAX_VIDEO_SIZE;
    if (Number.isFinite(contentLengthHeader) && contentLengthHeader > maxBytes) {
      return sendJson(res, 413, {
        ok: false,
        error: `File size exceeds ${Math.round(maxBytes / (1024 * 1024))}MB limit`,
      }, req);
    }

    const validation = validateVideoUpload({
      originalFilename: filename,
      mimeType: normMime.includes("multipart") ? "video/mp4" : normMime,
      title
    });

    if (!validation.valid) {
      return sendJson(res, 400, { ok: false, error: validation.error }, req);
    }

    const videoId = `user-video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const ext = extname(filename).toLowerCase() || ".mp4";
    const resolvedMime = normMime.startsWith("video/") ? normMime : "video/mp4";

    let storedFilePath;
    let totalBytes = 0;

    if (!dbOverride && capabilities.uploads.mode === "vercel-blob") {
      try {
        const buffer = await readUploadBuffer(req, maxBytes);
        totalBytes = buffer.length;
        if (totalBytes <= 0) {
          return sendJson(res, 400, { ok: false, error: "Video file is empty" }, req);
        }
        storedFilePath = await uploadToVercelBlob(`videos/${videoId}${ext}`, buffer, resolvedMime);
      } catch (err) {
        return sendJson(res, err?.statusCode || 400, { ok: false, error: err.message }, req);
      }
    } else {
      const targetPath = join(UPLOAD_DIR, `${videoId}${ext}`);
      const thumbPath = join(THUMB_DIR, `${videoId}.svg`);
      try {
        totalBytes = await readUploadStreamToDisk(req, targetPath, maxBytes);
        if (totalBytes <= 0) {
          try { if (existsSync(targetPath)) unlinkSync(targetPath); } catch {}
          return sendJson(res, 400, { ok: false, error: "Video file is empty" }, req);
        }
        const svgThumb = generateThumbnailSvg(title, category);
        writeFileSync(thumbPath, svgThumb, "utf8");
        storedFilePath = targetPath;
      } catch (err) {
        return sendJson(res, err?.statusCode || 400, { ok: false, error: err.message }, req);
      }
    }

    try {
      const video = createVideo(db, {
        userId: auth.user.id,
        title,
        description,
        category,
        genre: [category, "community"],
        originalFilename: filename,
        filePath: storedFilePath,
        thumbnailPath: `/api/videos/thumbnail/${videoId}`,
        fileSize: totalBytes,
        mimeType: resolvedMime,
        status: "ready"
      });

      return sendJson(res, 201, {
        ok: true,
        message: "Video uploaded and processed successfully!",
        video
      }, req);
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message || "Failed to save video record" }, req);
    }
  }

  // 3. GET /api/videos/:id - Video Details
  const singleMatch = route.match(/^\/api\/videos\/([a-zA-Z0-9_-]+)$/);
  if (method === "GET" && singleMatch) {
    const id = singleMatch[1];
    const video = getVideoById(resolveDb(), id);
    if (!video) return sendJson(res, 404, { ok: false, error: "Video not found" }, req);
    return sendJson(res, 200, { ok: true, video }, req);
  }

  // 4. GET /api/videos/thumbnail/:id - Return SVG thumbnail
  const thumbMatch = route.match(/^\/api\/videos\/thumbnail\/([a-zA-Z0-9_-]+)$/);
  if ((method === "GET" || method === "HEAD") && thumbMatch) {
    const id = thumbMatch[1];
    const thumbPath = join(THUMB_DIR, `${id}.svg`);
    const headers = {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=86400",
      "access-control-allow-origin": "*",
    };
    if (existsSync(thumbPath)) {
      const content = readFileSync(thumbPath);
      res.writeHead(200, headers);
      return method === "HEAD" ? res.end() : res.end(content);
    }

    const video = getVideoById(resolveDb(), id);
    const fallbackSvg = generateThumbnailSvg(video?.title || "Video", video?.category || "movies");
    res.writeHead(200, headers);
    return method === "HEAD" ? res.end() : res.end(fallbackSvg);
  }

  // 5. GET & HEAD /api/videos/stream/:id - HTTP Byte-Range Segmented Streaming
  const streamMatch = route.match(/^\/api\/videos\/stream\/([a-zA-Z0-9_-]+)$/);
  if ((method === "GET" || method === "HEAD") && streamMatch) {
    const db = resolveDb();
    const id = streamMatch[1];
    const video = getVideoById(db, id);
    if (!video) {
      return sendJson(res, 404, { ok: false, error: "Video stream not found" }, req);
    }

    const cors = getCorsHeaders(req, {
      methods: "GET, HEAD, OPTIONS",
      headers: "Range, Content-Type, Accept",
      exposeHeaders: "Content-Range, Accept-Ranges, Content-Length",
    });

    const filePath = video.filePath;
    if (/^https:\/\//i.test(filePath)) {
      res.writeHead(302, {
        Location: filePath,
        "Cache-Control": "no-store",
        ...cors,
      });
      return res.end();
    }

    if (!existsSync(filePath)) {
      return sendJson(res, 404, { ok: false, error: "Video media file not found on disk" }, req);
    }

    const fileStat = statSync(filePath);
    const totalSize = fileStat.size;
    const contentType = video.mimeType || "video/mp4";
    const rangeHeader = req.headers?.range;
    const parsedRange = parseByteRange(rangeHeader, totalSize);

    if (parsedRange && !parsedRange.valid) {
      res.writeHead(416, {
        "Content-Range": `bytes */${totalSize}`,
        "Accept-Ranges": "bytes",
        ...cors,
      });
      return res.end();
    }

    if (method === "GET" && (!parsedRange || parsedRange.start === 0)) {
      incrementVideoViews(db, id);
    }

    if (parsedRange) {
      const { start, end } = parsedRange;
      const chunkSize = end - start + 1;
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${totalSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
        "Cross-Origin-Resource-Policy": "cross-origin",
        ...cors,
      });

      if (method === "HEAD") return res.end();
      const stream = createReadStream(filePath, { start, end });
      return stream.pipe(res);
    }

    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": totalSize,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600",
      "Cross-Origin-Resource-Policy": "cross-origin",
      ...cors,
    });

    if (method === "HEAD") return res.end();
    const stream = createReadStream(filePath);
    return stream.pipe(res);
  }

  // 6. POST /api/videos/:id/view - Record video view
  const viewMatch = route.match(/^\/api\/videos\/([a-zA-Z0-9_-]+)\/view$/);
  if (method === "POST" && viewMatch) {
    const db = resolveDb();
    const id = viewMatch[1];
    incrementVideoViews(db, id);
    const video = getVideoById(db, id);
    return sendJson(res, 200, { ok: true, views: video?.views || 0 }, req);
  }

  // 7. DELETE /api/videos/:id - Delete uploaded video
  if (method === "DELETE" && singleMatch) {
    const db = resolveDb();
    const auth = getAuthFromReq(db, req);
    if (!auth) return sendJson(res, 401, { ok: false, error: "Authentication required" }, req);

    const id = singleMatch[1];
    try {
      const existing = getVideoById(db, id);
      const deleted = deleteVideo(db, id, auth.user.id);
      if (!deleted) return sendJson(res, 404, { ok: false, error: "Video not found or unauthorized" }, req);
      if (existing?.filePath && !/^https?:\/\//i.test(existing.filePath)) {
        try { if (existsSync(existing.filePath)) unlinkSync(existing.filePath); } catch {}
      }
      return sendJson(res, 200, { ok: true, message: "Video deleted successfully" }, req);
    } catch (err) {
      return sendJson(res, 403, { ok: false, error: err.message }, req);
    }
  }

  return false; // Route not matched by video handler
}
