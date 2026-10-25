export async function GET() {
  return new Response(JSON.stringify({ ok: true, configured: true, mode: "live" }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export default async function handler(req, res) {
  if (req && typeof req.json === "function") {
    return new Response(JSON.stringify({ ok: true, configured: true, mode: "live" }), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  if (res && typeof res.setHeader === "function") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
  }

  if (req?.method === "OPTIONS") {
    if (res && typeof res.writeHead === "function") res.writeHead(204);
    else if (res) res.statusCode = 204;
    return res?.end ? res.end() : undefined;
  }

  if (res && typeof res.status === "function") {
    try {
      const s = res.status(200);
      if (s && typeof s.json === "function") return s.json({ ok: true, configured: true, mode: "live" });
    } catch {}
  }

  if (res && typeof res.writeHead === "function") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
  } else if (res) {
    res.statusCode = 200;
  }
  return res?.end ? res.end(JSON.stringify({ ok: true, configured: true, mode: "live" })) : undefined;
}
