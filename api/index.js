export default function handler(req, res) {
  res.statusCode = 200;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify({
    ok: true,
    message: "api/index.js standalone works!",
    version: process.version,
    url: req.url,
    headers: req.headers
  }));
}
