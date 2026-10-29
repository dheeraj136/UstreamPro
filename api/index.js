export default async function api(req, res) {
  try {
    const { default: handler } = await import("../lib/server.js");
    return await handler(req, res);
  } catch (err) {
    console.error("[API Handler Error]:", err);
    if (!res.headersSent) {
      if (typeof res.status === "function") {
        return res.status(500).json({ ok: false, error: err.message || "Internal server error", stack: err.stack });
      }
      res.statusCode = 500;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ ok: false, error: err.message || "Internal server error", stack: err.stack }));
    }
  }
}
