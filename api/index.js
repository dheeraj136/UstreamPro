import handler from "../lib/server.js";

export default async function (req, res) {
  try {
    return await handler(req, res);
  } catch (err) {
    console.error("Vercel api handler crashed:", err);
    try {
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.setHeader("access-control-allow-origin", "*");
      res.statusCode = 500;
      res.end(JSON.stringify({
        error: "Internal Handler Error",
        message: err?.message || String(err),
        stack: err?.stack || null
      }));
    } catch {
      res.statusCode = 500;
      res.end("Internal Error");
    }
  }
}
