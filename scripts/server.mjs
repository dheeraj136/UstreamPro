import { createServer } from "node:http";
import { stat, readFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

// Mark local server runtime so NODE_ENV=production locally still uses ./data
if (!process.env.LOCAL_DEV && !process.env.VERCEL) {
  process.env.LOCAL_DEV = "1";
}

// Load local .env and .env.local before importing request handlers.
for (const envFile of ["../.env", "../.env.local"]) {
  try {
    const envText = await readFile(new URL(envFile, import.meta.url), "utf8");
    for (const line of envText.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match || Object.hasOwn(process.env, match[1])) continue;
      const value = match[2].replace(/^(["'])(.*)\1$/, "$2");
      process.env[match[1]] = value;
    }
  } catch {}
}

const { default: handler } = await import("../lib/server.js");
const { getCorsHeaders, parseByteRange } = await import("../lib/http-utils.js");

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PORT = Number(process.env.PORT || 4174);
const HOST = process.env.HOST || "0.0.0.0";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogg": "video/ogg",
  ".mov": "video/quicktime",
  ".m3u8": "application/vnd.apple.mpegurl",
  ".ts": "video/mp2t",
  ".vtt": "text/vtt; charset=utf-8",
};

const STATIC_ROOTS = [
  resolve(ROOT, "public"),
  resolve(ROOT, "src"),
  resolve(ROOT, "data"),
  ROOT,
];

const serveStatic = async (req, res, pathname) => {
  let decoded = pathname;
  try { decoded = decodeURIComponent(pathname); } catch {}
  const requested = decoded === "/" ? "/index.html" : decoded;
  const relPath = requested.replace(/^\/+/, "");

  for (const baseDir of STATIC_ROOTS) {
    const candidate = resolve(baseDir, relPath);
    if (candidate !== baseDir && !candidate.startsWith(baseDir + sep)) {
      continue;
    }
    try {
      const fileStat = await stat(candidate);
      if (!fileStat.isFile()) continue;

      const totalSize = fileStat.size;
      const contentType = MIME_TYPES[extname(candidate).toLowerCase()] || "application/octet-stream";
      const isMedia = contentType.startsWith("video/") || contentType.startsWith("audio/") || contentType.includes("mpegurl");
      const cors = getCorsHeaders(req, {
        methods: "GET, HEAD, OPTIONS",
        headers: "Range, Content-Type, Accept",
        exposeHeaders: "Content-Range, Accept-Ranges, Content-Length",
      });

      const parsedRange = isMedia ? parseByteRange(req.headers.range, totalSize) : null;
      if (parsedRange && !parsedRange.valid) {
        res.writeHead(416, {
          "Content-Range": `bytes */${totalSize}`,
          "Accept-Ranges": "bytes",
          ...cors,
        });
        return res.end();
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

        if (req.method === "HEAD") return res.end();
        const stream = createReadStream(candidate, { start, end });
        return stream.pipe(res);
      }

      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": totalSize,
        "Accept-Ranges": "bytes",
        "Cache-Control": isMedia ? "public, max-age=3600" : "no-cache",
        ...(isMedia ? { "Cross-Origin-Resource-Policy": "cross-origin" } : {}),
        ...cors,
      });

      if (req.method === "HEAD") return res.end();
      const stream = createReadStream(candidate);
      return stream.pipe(res);
    } catch {}
  }

  res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ error: "Not found", path: requested }));
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (url.pathname.startsWith("/api") || url.pathname === "/healthz") {
    return await handler(req, res);
  }
  return await serveStatic(req, res, url.pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`Ustream running at http://${HOST}:${PORT}`);
});

export { handler };
export default handler;
