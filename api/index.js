export default function handler(req, res) {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ ok: true, message: "Hello from Vercel API", time: Date.now() }));
}
