import { createServer } from "node:http";
import { stat, readFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
// Load local .env before importing the request handler, which reads
// TMDB_API_KEY when it receives a request.
try {
  const envText = await readFile(new URL("../.env", import.meta.url), "utf8");
  for (const line of envText.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || Object.hasOwn(process.env, match[1])) continue;
    const value = match[2].replace(/^(["'])(.*)\1$/, "$2");
    process.env[match[1]] = value;
  }
} catch {}
const { default: handler } = await import("../lib/server.js");

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
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogg": "video/ogg",
  ".mov": "video/quicktime",
  ".m3u8": "application/vnd.apple.mpegurl",
  ".ts": "video/mp2t",
  ".vtt": "text/vtt; charset=utf-8",
};

const serveStatic = async (req, res, pathname) => {
  let decoded = pathname;
  try { decoded = decodeURIComponent(pathname); } catch {}
  const requested = decoded === "/" ? "/index.html" : decoded;
  const candidates = [
    resolve(ROOT, "public", `.${requested}`),
    resolve(ROOT, "src", `.${requested}`),
    resolve(ROOT, "data", `.${requested}`),
    resolve(ROOT, `.${requested}`),
  ];

  for (const candidate of candidates) {
    try {
      const fileStat = await stat(candidate);
      if (!fileStat.isFile()) continue;

      const totalSize = fileStat.size;
      const contentType = MIME_TYPES[extname(candidate).toLowerCase()] || "application/octet-stream";
      const isMedia = contentType.startsWith("video/") || contentType.startsWith("audio/") || contentType.includes("mpegurl");

      // HTTP Byte-Range Request Handling (RFC 7233)
      const range = req.headers.range;
      if (range && isMedia) {
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
        const stream = createReadStream(candidate, { start, end });
        return stream.pipe(res);
      }

      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": totalSize,
        "Accept-Ranges": "bytes",
        "Cache-Control": isMedia ? "public, max-age=3600" : "no-cache",
        "Access-Control-Allow-Origin": "*",
      });

      if (req.method === "HEAD") return res.end();
      const stream = createReadStream(candidate);
      return stream.pipe(res);
    } catch {}
  }

  res.writeHead(404, { "Content-Type": "application/json" });
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
