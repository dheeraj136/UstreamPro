export default function handler(req, res) {
  res.setHeader("access-control-allow-origin", "*");
  res.status(200).json({ ok: true, configured: true, mode: "live" });
}
