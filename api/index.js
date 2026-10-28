let cachedHandler = null;

export default async function apiHandler(req, res) {
  try {
    if (!cachedHandler) {
      const mod = await import("../lib/server.js");
      cachedHandler = mod.default || mod.handler;
    }
    return await cachedHandler(req, res);
  } catch (err) {
    console.error("[Vercel API Boot Error]:", err);
    const origin = req.headers?.origin;
    const headers = {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": origin || "*",
      ...(origin ? { "access-control-allow-credentials": "true" } : {})
    };
    const errorBody = JSON.stringify({
      ok: false,
      error: "Server Initialization Error",
      message: err.message,
      stack: err.stack,
      version: process.version
    });

    if (typeof res.writeHead === "function") {
      res.writeHead(500, headers);
      res.end(errorBody);
      return;
    }
    if (typeof res.status === "function") {
      return res.status(500).json(JSON.parse(errorBody));
    }
    res.statusCode = 500;
    res.end(errorBody);
  }
}

export { apiHandler as handler };
