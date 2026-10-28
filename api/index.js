import https from "node:https";

export default async function universalHandler(req, res) {
  const isNode = Boolean(res && typeof res.end === "function");

  const sendJson = (data, status = 200, headers = {}) => {
    const body = typeof data === "string" ? data : JSON.stringify(data);
    if (isNode) {
      res.statusCode = status;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.setHeader("access-control-allow-origin", "*");
      res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
      res.setHeader("access-control-allow-headers", "Content-Type");
      for (const [k, v] of Object.entries(headers)) {
        res.setHeader(k, v);
      }
      return res.end(body);
    }
    return new Response(body, {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "Content-Type",
        ...headers
      }
    });
  };

  try {
    const rawUrl = req?.url || "";
    const pathname = (rawUrl.split("?")[0] || "").toLowerCase();

    // CORS preflight
    if (req?.method === "OPTIONS") {
      return sendJson({ ok: true }, 200);
    }

    // Live Sports and Live TV Proxy
    if (pathname.includes("/api/sports") || pathname.includes("/api/livetv")) {
      try {
        const json = await new Promise((resolve, reject) => {
          const r = https.get("https://bintvjson.lovable.app/api/public/bintvjson", {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "application/json"
            },
            timeout: 8000
          }, (upRes) => {
            let data = "";
            upRes.on("data", c => data += c);
            upRes.on("end", () => {
              if (upRes.statusCode && upRes.statusCode >= 200 && upRes.statusCode < 300) {
                resolve(data);
              } else {
                reject(new Error("Upstream status: " + upRes.statusCode));
              }
            });
          });
          r.on("error", reject);
          r.on("timeout", () => { r.destroy(); reject(new Error("Upstream timeout")); });
        });

        return sendJson(json, 200, {
          "cache-control": "public, max-age=30, s-maxage=30, stale-while-revalidate=60"
        });
      } catch (proxyErr) {
        console.error("Sports proxy failure:", proxyErr.message);
      }
    }

    return sendJson({
      ok: true,
      url: req?.url,
      method: req?.method
    });
  } catch (err) {
    return sendJson({ ok: false, error: err.message }, 500);
  }
}
