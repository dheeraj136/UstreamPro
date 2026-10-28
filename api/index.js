export default async function universalHandler(req, res) {
  try {
    const isWebStandard = !res || (typeof res.setHeader !== "function" && typeof res.writeHead !== "function" && typeof res.status !== "function");
    const rawUrl = req?.url || "";
    const pathname = (rawUrl.split("?")[0] || "").toLowerCase();

    // Live Sports API Proxy / Cache Endpoint
    if (pathname.includes("/api/sports") || pathname.includes("/api/livetv")) {
      try {
        const upstream = await fetch("https://bintvjson.lovable.app/api/public/bintvjson", {
          headers: {
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });
        if (upstream.ok) {
          const data = await upstream.json();
          const jsonStr = JSON.stringify(data);
          if (isWebStandard) {
            return new Response(jsonStr, {
              status: 200,
              headers: {
                "content-type": "application/json; charset=utf-8",
                "access-control-allow-origin": "*",
                "cache-control": "public, max-age=30, s-maxage=30, stale-while-revalidate=60"
              }
            });
          }
          res.statusCode = 200;
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.setHeader("access-control-allow-origin", "*");
          res.setHeader("cache-control", "public, max-age=30, s-maxage=30, stale-while-revalidate=60");
          return res.end(jsonStr);
        }
      } catch (proxyErr) {
        console.error("Live sports upstream error:", proxyErr);
      }
    }

    if (isWebStandard) {
      return new Response(JSON.stringify({
        ok: true,
        mode: "web-standard",
        url: req?.url,
        method: req?.method
      }), {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" }
      });
    }

    res.statusCode = 200;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({
      ok: true,
      mode: "node-req-res",
      url: req?.url,
      method: req?.method
    }));
  } catch (err) {
    if (typeof Response !== "undefined") {
      return new Response(JSON.stringify({ ok: false, error: err.message, stack: err.stack }), {
        status: 500,
        headers: { "content-type": "application/json" }
      });
    }
    if (res && res.end) {
      res.statusCode = 500;
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }
}
