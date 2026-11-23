// Public capability status only: never return the TMDB API key itself.
export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Accept");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const configured = Boolean(String(process.env.TMDB_API_KEY || "").trim());
  return res.status(200).json({
    ok: true,
    service: "ustream",
    configured,
    tmdbApiKeyConfigured: configured,
    mode: configured ? "live" : "browser-fallback",
  });
}
