import { randomUUID } from "node:crypto";
import { extname } from "node:path";

export const MAX_VIDEO_SIZE = 150 * 1024 * 1024; // 150MB

export const ALLOWED_EXTENSIONS = new Set([".mp4", ".webm", ".ogg", ".mov", ".mkv"]);

export const ALLOWED_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-matroska"
]);

export function validateVideoUpload({ originalFilename, mimeType, size, title }) {
  if (!title || typeof title !== "string" || !title.trim()) {
    return { valid: false, error: "Video title is required" };
  }
  if (title.trim().length > 120) {
    return { valid: false, error: "Video title must not exceed 120 characters" };
  }

  if (!originalFilename || typeof originalFilename !== "string") {
    return { valid: false, error: "Valid video file name is required" };
  }

  const ext = extname(originalFilename).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `Unsupported video format "${ext}". Allowed: ${[...ALLOWED_EXTENSIONS].join(", ")}`
    };
  }

  const normMime = (mimeType || "").toLowerCase().trim();
  if (normMime && !ALLOWED_MIME_TYPES.has(normMime)) {
    return {
      valid: false,
      error: `Unsupported media MIME type "${mimeType}". Allowed: ${[...ALLOWED_MIME_TYPES].join(", ")}`
    };
  }

  if (typeof size === "number") {
    if (size <= 0) {
      return { valid: false, error: "Video file is empty" };
    }
    if (size > MAX_VIDEO_SIZE) {
      return {
        valid: false,
        error: `File size exceeds the 150MB limit (uploaded: ${(size / 1024 / 1024).toFixed(1)}MB)`
      };
    }
  }

  return { valid: true };
}

export function generateThumbnailSvg(title, category = "movies") {
  const safeTitle = String(title || "Untitled Video")
    .replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeCat = String(category || "Video").toUpperCase();

  const gradients = {
    movies: ["#1e1b4b", "#0f172a", "#020617"],
    series: ["#082f49", "#0c4a6e", "#020617"],
    anime: ["#701a75", "#4a044e", "#020617"],
    cartoons: ["#831843", "#500724", "#020617"],
    sports: ["#064e3b", "#022c22", "#020617"]
  };
  const [g1, g2, g3] = gradients[category.toLowerCase()] || gradients.movies;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${g1}" />
      <stop offset="60%" stop-color="${g2}" />
      <stop offset="100%" stop-color="${g3}" />
    </linearGradient>
    <linearGradient id="btn" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#e7ff51" />
      <stop offset="100%" stop-color="#bbf200" />
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#e7ff51" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#e7ff51" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)" />
  <circle cx="640" cy="360" r="320" fill="url(#glow)" />
  <g transform="translate(640, 360)">
    <circle r="54" fill="rgba(255, 255, 255, 0.08)" stroke="rgba(255, 255, 255, 0.2)" stroke-width="2" />
    <polygon points="-12,-20 22,0 -12,20" fill="#e7ff51" />
  </g>
  <g transform="translate(64, 80)">
    <rect width="140" height="36" rx="18" fill="rgba(231, 255, 81, 0.12)" stroke="#e7ff51" stroke-width="1.5" />
    <text x="70" y="23" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" fill="#e7ff51" text-anchor="middle" letter-spacing="1">${safeCat}</text>
  </g>
  <text x="64" y="600" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="800" fill="#ffffff" letter-spacing="-0.5">${safeTitle}</text>
  <text x="64" y="640" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="500" fill="rgba(255, 255, 255, 0.6)">Ustream Community Premiere · High Definition</text>
</svg>`;
}

export function createVideo(db, {
  userId,
  profileId = null,
  title,
  description = "",
  category = "movies",
  genre = ["general"],
  originalFilename,
  filePath,
  thumbnailPath = null,
  duration = 0,
  fileSize,
  mimeType,
  status = "ready"
}) {
  const id = `user-video-${randomUUID()}`;
  const now = Date.now();
  const genreJson = JSON.stringify(Array.isArray(genre) ? genre : [String(genre)]);

  const stmt = db.prepare(`
    INSERT INTO videos (
      id, user_id, profile_id, title, description, category, genre,
      original_filename, file_path, thumbnail_path, duration, file_size,
      mime_type, status, error_message, views, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, ?, ?)
  `);

  stmt.run(
    id, userId, profileId, title.trim(), description.trim(), category, genreJson,
    originalFilename, filePath, thumbnailPath, duration, fileSize,
    mimeType, status, now, now
  );

  return getVideoById(db, id);
}

export function getVideoById(db, id) {
  const stmt = db.prepare("SELECT * FROM videos WHERE id = ?");
  const row = stmt.get(id);
  if (!row) return null;

  return formatVideoRow(row);
}

export function listVideos(db, { category = "all", status = "ready", limit = 50, offset = 0, userId = null } = {}) {
  let sql = "SELECT * FROM videos WHERE 1=1";
  const params = [];

  if (status && status !== "all") {
    sql += " AND status = ?";
    params.push(status);
  }

  if (category && category !== "all") {
    sql += " AND category = ?";
    params.push(category);
  }

  if (userId) {
    sql += " AND user_id = ?";
    params.push(userId);
  }

  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(Math.max(1, Math.min(100, limit)), Math.max(0, offset));

  const stmt = db.prepare(sql);
  const rows = stmt.all(...params);
  return rows.map(formatVideoRow);
}

export function updateVideoStatus(db, id, status, errorMessage = null, thumbnailPath = null, duration = null) {
  const now = Date.now();
  let sql = "UPDATE videos SET status = ?, error_message = ?, updated_at = ?";
  const params = [status, errorMessage, now];

  if (thumbnailPath !== null) {
    sql += ", thumbnail_path = ?";
    params.push(thumbnailPath);
  }

  if (duration !== null) {
    sql += ", duration = ?";
    params.push(duration);
  }

  sql += " WHERE id = ?";
  params.push(id);

  const stmt = db.prepare(sql);
  stmt.run(...params);
  return getVideoById(db, id);
}

export function incrementVideoViews(db, id) {
  const stmt = db.prepare("UPDATE videos SET views = views + 1, updated_at = ? WHERE id = ?");
  stmt.run(Date.now(), id);
}

export function deleteVideo(db, id, userId) {
  const video = getVideoById(db, id);
  if (!video) return false;
  if (video.userId !== userId) {
    throw new Error("You do not have permission to delete this video");
  }

  const stmt = db.prepare("DELETE FROM videos WHERE id = ? AND user_id = ?");
  const res = stmt.run(id, userId);
  return (res.changes || 0) > 0;
}

function formatVideoRow(row) {
  let genre = ["general"];
  try {
    genre = JSON.parse(row.genre || "[]");
  } catch {}

  const durationSec = Number(row.duration || 0);
  const durationLabel = durationSec > 0
    ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`
    : "Video";

  return {
    id: row.id,
    subjectId: row.id,
    userId: row.user_id,
    profileId: row.profile_id,
    title: row.title,
    description: row.description || "",
    category: row.category,
    type: row.category === "series" ? "series" : "movie",
    genre,
    originalFilename: row.original_filename,
    filePath: row.file_path,
    thumbnailPath: row.thumbnail_path,
    image: row.thumbnail_path || `/api/videos/thumbnail/${row.id}`,
    backdrop: row.thumbnail_path || `/api/videos/thumbnail/${row.id}`,
    duration: durationLabel,
    runtime: durationLabel,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    status: row.status,
    errorMessage: row.error_message,
    views: row.views || 0,
    rating: 8.5,
    badge: "Community Upload",
    kicker: "User Showcase",
    video: `/api/videos/stream/${row.id}`,
    playUrl: { url: `/api/videos/stream/${row.id}` },
    hasResource: true,
    isUserUpload: true,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
