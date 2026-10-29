import { createWriteStream, existsSync, mkdirSync, statSync, createReadStream } from "node:fs";
import { join, resolve, extname } from "node:path";
import { getDb } from "./db.js";
import {
  createVideo,
  getVideoById,
  listVideos,
  updateVideoStatus,
  incrementVideoViews,
  deleteVideo,
  validateVideoUpload,
  generateThumbnailSvg,
  MAX_VIDEO_SIZE
} from "./video-service.js";
import { parseCookies, validateSession } from "./auth-service.js";

const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  (process.env.NODE_ENV === "production" && !process.env.LOCAL_DEV)
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
  const origin = req?.headers?.origin;
  if (typeof res.setHeader === "function") {
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.setHeader("cache-control", "no-store, no-cache, must-revalidate");
    if (origin) {
      res.setHeader("access-control-allow-origin", origin);
      res.setHeader("access-control-allow-credentials", "true");
    } else {
      res.setHeader("access-control-allow-origin", "*");
    }
    res.setHeader("access-control-allow-headers", "content-type, authorization, range");
    res.setHeader("access-control-allow-methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD");
  }

  if (typeof res.writeHead === "function") {
    res.writeHead(status, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": origin || "*",
      "access-control-allow-headers": "content-type, authorization, range",
      "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS, HEAD",
    });
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

export async function handleVideoRoute(req, res, pathname, dbOverride = null) {
  const db = dbOverride || getDb();
  const method = req.method.toUpperCase();
  const route = pathname.replace(/\/$/, "");

  // CORS preflight
  if (method === "OPTIONS" && route.startsWith("/api/videos")) {
    if (typeof res.setHeader === "function") {
      res.setHeader("access-control-allow-origin", req.headers.origin || "*");
      res.setHeader("access-control-allow-methods", "GET, POST, DELETE, OPTIONS, HEAD");
      res.setHeader("access-control-allow-headers", "content-type, authorization, range, x-filename, x-title, x-category, x-description");
      res.setHeader("access-control-allow-credentials", "true");
      res.statusCode = 204;
      return res.end();
    }
  }

  // 1. GET /api/videos - List public videos
  if (method === "GET" && route === "/api/videos") {
    const urlObj = new URL(req.url, "http://localhost");
    const category = urlObj.searchParams.get("category") || "all";
    const status = urlObj.searchParams.get("status") || "ready";
    const limit = parseInt(urlObj.searchParams.get("limit") || "50", 10);
    const offset = parseInt(urlObj.searchParams.get("offset") || "0", 10);
    const userId = urlObj.searchParams.get("userId") || null;

    const videos = listVideos(db, { category, status, limit, offset, userId });
    return sendJson(res, 200, { ok: true, count: videos.length, videos }, req);
  }

  // 2. POST /api/videos/upload - Video Upload & Processing
  if (method === "POST" && route === "/api/videos/upload") {
    const auth = getAuthFromReq(db, req);
    if (!auth) {
      return sendJson(res, 401, { ok: false, error: "Authentication required to upload videos" }, req);
    }

    const contentType = (req.headers["content-type"] || "").toLowerCase();

    // Support streaming binary upload with headers or JSON chunk
    const rawFilename = req.headers["x-filename"] || req.headers["x-file-name"] || "video.mp4";
    let filename = "video.mp4";
    try {
      filename = decodeURIComponent(rawFilename);
    } catch {
      filename = rawFilename;
    }
    const title = decodeURIComponent(req.headers["x-title"] || filename.replace(/\.[^/.]+$/, ""));
    const category = decodeURIComponent(req.headers["x-category"] || "movies");
    const description = decodeURIComponent(req.headers["x-description"] || "");

    const validation = validateVideoUpload({
      originalFilename: filename,
      mimeType: contentType.includes("multipart") ? "video/mp4" : contentType,
      title
    });

    if (!validation.valid) {
      return sendJson(res, 400, { ok: false, error: validation.error }, req);
    }

    const videoId = `user-video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const ext = extname(filename).toLowerCase() || ".mp4";
    const targetPath = join(UPLOAD_DIR, `${videoId}${ext}`);
    const thumbPath = join(THUMB_DIR, `${videoId}.svg`);

    // Stream directly to file
    const writeStream = createWriteStream(targetPath);
    let totalBytes = 0;
    let sizeExceeded = false;

    await new Promise((resolve, reject) => {
      req.on("data", (chunk) => {
        totalBytes += chunk.length;
        if (totalBytes > MAX_VIDEO_SIZE) {
          sizeExceeded = true;
          req.pause();
          writeStream.destroy();
          reject(new Error(`File size exceeds 150MB limit`));
          return;
        }
        writeStream.write(chunk);
      });

      req.on("end", () => {
        writeStream.end();
        resolve();
      });

      req.on("error", (err) => {
        writeStream.destroy();
        reject(err);
      });
    }).catch((err) => {
      return sendJson(res, 400, { ok: false, error: err.message }, req);
    });

    if (sizeExceeded) return;

    // Generate custom modern thumbnail SVG
    const svgThumb = generateThumbnailSvg(title, category);
    const { writeFileSync } = await import("node:fs");
    writeFileSync(thumbPath, svgThumb, "utf8");

    // Insert database record
    try {
      const video = createVideo(db, {
        userId: auth.user.id,
        title,
        description,
        category,
        genre: [category, "community"],
        originalFilename: filename,
        filePath: targetPath,
        thumbnailPath: `/api/videos/thumbnail/${videoId}`,
        fileSize: totalBytes,
        mimeType: contentType.startsWith("video/") ? contentType : "video/mp4",
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
    const video = getVideoById(db, id);
    if (!video) return sendJson(res, 404, { ok: false, error: "Video not found" }, req);
    return sendJson(res, 200, { ok: true, video }, req);
  }

  // 4. GET /api/videos/thumbnail/:id - Return SVG / image thumbnail
  const thumbMatch = route.match(/^\/api\/videos\/thumbnail\/([a-zA-Z0-9_-]+)$/);
  if (method === "GET" && thumbMatch) {
    const id = thumbMatch[1];
    const thumbPath = join(THUMB_DIR, `${id}.svg`);
    if (existsSync(thumbPath)) {
      const { readFileSync } = await import("node:fs");
      const content = readFileSync(thumbPath);
      res.writeHead(200, {
        "content-type": "image/svg+xml",
        "cache-control": "public, max-age=86400",
        "access-control-allow-origin": "*"
      });
      return res.end(content);
    }

    const video = getVideoById(db, id);
    const fallbackSvg = generateThumbnailSvg(video?.title || "Video", video?.category || "movies");
    res.writeHead(200, {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=86400",
      "access-control-allow-origin": "*"
    });
    return res.end(fallbackSvg);
  }

  // 5. GET /api/videos/stream/:id - HTTP Byte-Range Segmented Streaming
  const streamMatch = route.match(/^\/api\/videos\/stream\/([a-zA-Z0-9_-]+)$/);
  if (method === "GET" && streamMatch) {
    const id = streamMatch[1];
    const video = getVideoById(db, id);
    if (!video) {
      return sendJson(res, 404, { ok: false, error: "Video stream not found" }, req);
    }

    incrementVideoViews(db, id);

    const filePath = video.filePath;
    if (!existsSync(filePath)) {
      return sendJson(res, 404, { ok: false, error: "Video media file not found on disk" }, req);
    }

    const fileStat = statSync(filePath);
    const totalSize = fileStat.size;
    const contentType = video.mimeType || "video/mp4";

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10) || 0;
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (start >= totalSize || end >= totalSize || start > end) {
        res.writeHead(416, {
          "Content-Range": `bytes */${totalSize}`,
          "Access-Control-Allow-Origin": "*",
        });
        return res.end();
      }

      const chunkSize = end - start + 1;
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${totalSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      });

      if (req.method === "HEAD") return res.end();
      const stream = createReadStream(filePath, { start, end });
      return stream.pipe(res);
    }

    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": totalSize,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    });

    if (req.method === "HEAD") return res.end();
    const stream = createReadStream(filePath);
    return stream.pipe(res);
  }

  // 6. POST /api/videos/:id/view - Record video view
  const viewMatch = route.match(/^\/api\/videos\/([a-zA-Z0-9_-]+)\/view$/);
  if (method === "POST" && viewMatch) {
    const id = viewMatch[1];
    incrementVideoViews(db, id);
    const video = getVideoById(db, id);
    return sendJson(res, 200, { ok: true, views: video?.views || 0 }, req);
  }

  // 7. DELETE /api/videos/:id - Delete uploaded video
  if (method === "DELETE" && singleMatch) {
    const auth = getAuthFromReq(db, req);
    if (!auth) return sendJson(res, 401, { ok: false, error: "Authentication required" }, req);

    const id = singleMatch[1];
    try {
      const deleted = deleteVideo(db, id, auth.user.id);
      if (!deleted) return sendJson(res, 404, { ok: false, error: "Video not found or unauthorized" }, req);
      return sendJson(res, 200, { ok: true, message: "Video deleted successfully" }, req);
    } catch (err) {
      return sendJson(res, 403, { ok: false, error: err.message }, req);
    }
  }

  return false; // Route not matched by video handler
}
