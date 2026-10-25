export default function handler(req, res) {
  if (typeof res.setHeader === "function") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
  }
  if (req?.method === "OPTIONS") {
    if (typeof res.writeHead === "function") res.writeHead(204);
    else res.statusCode = 204;
    return res.end();
  }
  if (typeof res.status === "function") {
    try {
      const s = res.status(200);
      if (s && typeof s.json === "function") return s.json({ ok: true, configured: true, mode: "live" });
    } catch {}
  }
  if (typeof res.writeHead === "function") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
  } else {
    res.statusCode = 200;
  }
  return res.end(JSON.stringify({ ok: true, configured: true, mode: "live" }));
}
