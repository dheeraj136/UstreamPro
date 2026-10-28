import handler from "../lib/server.js";

export default async function api(req, res) {
  try {
    return await handler(req, res);
  } catch (err) {
    console.error("[API Handler Error]:", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ ok: false, error: err.message || "Internal server error" }));
    }
  }
}
