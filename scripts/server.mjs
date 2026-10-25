import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import handler from "../api/index.js";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PORT = Number(process.env.PORT || 4174);
const HOST = process.env.HOST || "0.0.0.0";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".vtt": "text/vtt; charset=utf-8",
};

const serveStatic = async (req, res, pathname) => {
  let decoded = pathname;
  try { decoded = decodeURIComponent(pathname); } catch {}
  const requested = decoded === "/" ? "/index.html" : decoded;
  const candidates = [
    resolve(ROOT, "public", `.${requested}`),
    resolve(ROOT, "src", `.${requested}`),
    resolve(ROOT, `.${requested}`),
  ];
  for (const candidate of candidates) {
    try {
      const contents = await readFile(candidate);
      res.writeHead(200, {
        "content-type": MIME_TYPES[extname(candidate).toLowerCase()] || "application/octet-stream",
        "content-length": contents.length,
        "cache-control": "no-cache",
        "access-control-allow-origin": "*",
      });
      if (req.method === "HEAD") return res.end();
      return res.end(contents);
    } catch {}
  }
  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
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
