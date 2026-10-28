export default async function universalHandler(req, res) {
  try {
    const isWebStandard = !res || (typeof res.setHeader !== "function" && typeof res.writeHead !== "function" && typeof res.status !== "function");
    
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
